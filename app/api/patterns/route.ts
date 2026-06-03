// V3: Pattern query API — historical similarity data for signal pairs.
// Auth-gated. Returns pattern match results or all pair stats.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { matchHistoricalPattern, getAllPairStats } from "@/lib/patterns";
import { EXPECTATION_REGISTRY } from "@/lib/expectations";
import { SIGNAL_REGISTRY, type SignalDirection } from "@/lib/signals";

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pairId = searchParams.get("pair");
  const all = searchParams.get("all");
  const lookback = parseInt(searchParams.get("lookback") || "365", 10);

  try {
    // Return all pair stats
    if (all === "true") {
      const stats = await getAllPairStats();
      return NextResponse.json(stats);
    }

    // Return single pattern match
    if (pairId) {
      const exp = EXPECTATION_REGISTRY.find((e) => e.id === pairId);
      if (!exp) {
        return NextResponse.json({ error: "Unknown pair ID" }, { status: 400 });
      }

      // Default to divergence direction (falling vs rising)
      const dirA: SignalDirection = "falling";
      const dirB: SignalDirection = "falling";

      const result = await matchHistoricalPattern(
        pairId,
        dirA,
        dirB,
        exp.signalA,
        exp.signalB,
        lookback
      );

      const arrow = (d: SignalDirection) => d === "rising" ? "↑" : d === "falling" ? "↓" : "→";
      const labelA = SIGNAL_REGISTRY[exp.signalA]?.label ?? exp.signalA;
      const labelB = SIGNAL_REGISTRY[exp.signalB]?.label ?? exp.signalB;
      result.currentDescription = `${labelA} ${arrow(dirA)}, ${labelB} ${arrow(dirB)}`;

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide ?pair= or ?all=true" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[api/patterns] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
