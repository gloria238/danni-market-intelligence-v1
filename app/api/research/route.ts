import { NextRequest, NextResponse } from "next/server";
import { generateResearch } from "@/lib/ai";
import { detectIntent } from "@/lib/intent";
import {
  fetchAllMarketData,
  fetchNewsHeadlines,
  type MarketContext,
} from "@/lib/market-data";

export async function POST(request: NextRequest) {
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

    // 3. Generate research with coverage-aware narrative framework
    const result = await generateResearch(question.trim(), marketCtx, intent);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
