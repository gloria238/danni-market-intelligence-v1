import { NextRequest, NextResponse } from "next/server";
import { generateResearch } from "@/lib/ai";
import { detectIntent } from "@/lib/intent";
import {
  fetchAllMarketData,
  fetchNewsHeadlines,
  type MarketContext,
} from "@/lib/market-data";
import { insertBatchSnapshots } from "@/lib/db/signal-history-store";
import { detectDivergences } from "@/lib/expectations";
import { matchCurrentDivergences } from "@/lib/patterns";
import { assessResearchHealth } from "@/lib/confidence";
import { generateEvidence } from "@/lib/evidence";
import { computeAttribution } from "@/lib/attribution";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Auth gate — prevent unauthorized LLM API calls
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { question } = await request.json();

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // 1. Detect intent
    const intent = detectIntent(question.trim());

    // 2. Fetch all market data sources in parallel (CoinGecko + FRED + Farside + News)
    const [snapshot, headlines] = await Promise.all([
      fetchAllMarketData().catch(() => null),
      fetchNewsHeadlines().catch(() => []),
    ]);

    const marketCtx: MarketContext = { snapshot, headlines };

    // V3: Record signal history in background (fire-and-forget, don't block pipeline)
    if (snapshot && snapshot.availableCount > 0) {
      insertBatchSnapshots(snapshot.signals).catch(() => {
        // Silent — history recording failure should never block the user
      });
    }

    // V3-V5: Pure computation pipeline (all before LLM)
    const crossSignal = snapshot ? detectDivergences(snapshot.signals) : null;
    const btcChange24h = snapshot?.signals.BTC_24H_CHANGE?.rawValue ?? null;
    const attribution = computeAttribution(btcChange24h, snapshot?.signals ?? {});
    const patterns = crossSignal && snapshot
      ? await matchCurrentDivergences(crossSignal.divergences, snapshot.signals)
      : {};
    const health = snapshot
      ? assessResearchHealth(snapshot.signals, [
          { source: "CoinGecko", ok: (snapshot.signals.BTC_PRICE?.available ?? false) },
          { source: "FRED", ok: (snapshot.signals.DXY_INDEX?.available ?? false) },
          { source: "Farside", ok: (snapshot.signals.BTC_ETF_FLOW?.available ?? false) },
          { source: "NewsAPI", ok: headlines.length > 0 },
        ])
      : null;
    const evidence = crossSignal && snapshot
      ? generateEvidence(snapshot.signals, crossSignal.divergences, attribution, patterns, headlines)
      : null;

    // 3. Generate research with full reasoning stack
    const result = await generateResearch(
      question.trim(),
      marketCtx,
      intent,
      patterns,
      health,
      evidence
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
