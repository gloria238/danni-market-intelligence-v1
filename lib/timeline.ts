// Research Timeline — stitch signal history + divergence observations into
// a chronological narrative of market events.
//
// V5.5: Visualizable research timeline. Pure data assembly — no LLM.
// Every event is sourced from signal_history or divergence_observations.

import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/* ——— Types ——— */

export type TimelineEventType =
  | "signal_move"      // signal had a significant delta that day
  | "divergence"       // a divergence was detected for a pair
  | "resolution";      // a divergence resolved (bullish/bearish/faded)

export interface TimelineEvent {
  id: string;
  date: string;              // YYYY-MM-DD
  type: TimelineEventType;
  /** Human-readable title */
  title: string;
  /** Additional detail */
  detail: string;
  /** Associated signal IDs (for filtering) */
  signalIds: string[];
  /** Severity for divergences, null for signal moves */
  severity?: number;
  /** Direction context */
  direction?: "rising" | "falling" | "neutral";
  /** Resolution direction if resolved */
  resolution?: string;
}

export interface TimelineResult {
  events: TimelineEvent[];
  dateRange: { from: string; to: string };
  totalEvents: number;
}

/* ——— Query ——— */

export async function getTimeline(
  fromDate: string,
  toDate: string,
  pairId?: string
): Promise<TimelineResult> {
  const client = getClient();
  const events: TimelineEvent[] = [];

  // 1. Significant signal moves from signal_history
  //    A "significant move" = |delta| > typicalStdDev
  const THRESHOLDS: Record<string, number> = {
    BTC_PRICE: 1500,
    BTC_24H_CHANGE: 2.5,
    ETH_PRICE: 100,
    GOLD_PRICE: 25,
    DXY_INDEX: 0.3,
    US10Y_YIELD: 0.04,
    US2Y_YIELD: 0.05,
    BTC_ETF_FLOW: 150,
  };

  const { data: signalRows } = await client
    .from("signal_history")
    .select("*")
    .gte("recorded_at", fromDate)
    .lte("recorded_at", toDate)
    .order("recorded_at", { ascending: true });

  const signalLabels: Record<string, string> = {
    BTC_PRICE: "BTC Price",
    BTC_24H_CHANGE: "BTC 24h Change",
    ETH_PRICE: "ETH Price",
    GOLD_PRICE: "Gold (XAUT)",
    DXY_INDEX: "DXY",
    US10Y_YIELD: "US 10Y Yield",
    US2Y_YIELD: "US 2Y Yield",
    FED_FUNDS_RATE: "Fed Funds Rate",
    BTC_ETF_FLOW: "BTC ETF Flow",
    MARKET_NEWS: "Market News",
  };

  for (const row of (signalRows || [])) {
    const threshold = THRESHOLDS[row.signal_id];
    if (!threshold) continue;

    const delta = row.delta != null ? Number(row.delta) : null;
    if (delta == null) continue;

    const absDelta = Math.abs(delta);
    if (absDelta < threshold) continue; // not significant enough

    const direction: TimelineEvent["direction"] =
      delta > 0 ? "rising" : "falling";
    const label = signalLabels[row.signal_id] || row.signal_id;
    const arrow = direction === "rising" ? "↑" : "↓";
    const sigma = Math.round((absDelta / threshold) * 10) / 10;

    events.push({
      id: `sig-${row.id}`,
      date: row.recorded_at,
      type: "signal_move",
      title: `${label} ${arrow}`,
      detail: `${label} moved ${delta >= 0 ? "+" : ""}${Number(delta).toFixed(2)} (${sigma}σ) — value: ${Number(row.value).toLocaleString()}`,
      signalIds: [row.signal_id],
      direction,
    });
  }

  // 2. Divegence observations from divergence_observations
  let divQuery = client
    .from("divergence_observations")
    .select("*")
    .gte("observed_date", fromDate)
    .lte("observed_date", toDate)
    .order("observed_date", { ascending: true });

  if (pairId) divQuery = divQuery.eq("signal_pair_id", pairId);

  const { data: divRows } = await divQuery;

  const pairLabels: Record<string, string> = {
    DXY_BTC: "DXY vs BTC",
    YIELD_BTC: "US10Y vs BTC",
    GOLD_DXY: "Gold vs DXY",
    ETF_BTC: "ETF vs BTC",
    YIELDS_DXY: "US10Y vs DXY",
    GOLD_BTC: "Gold vs BTC",
    CURVE_STEEPENING: "US2Y vs US10Y",
  };

  for (const row of (divRows || [])) {
    const pairLabel = pairLabels[row.signal_pair_id] || row.signal_pair_id;
    const severity = Number(row.severity_score);
    const isDivergence = row.divergence_type === "divergence";
    const isResolved = row.resolution_date != null;

    if (isResolved) {
      const resolutionLabel =
        row.resolution_direction === "realigned_bullish"
          ? "Resolved Bullish"
          : row.resolution_direction === "realigned_bearish"
            ? "Resolved Bearish"
            : row.resolution_direction === "faded"
              ? "Faded"
              : "Resolved";

      events.push({
        id: `res-${row.id}`,
        date: row.resolution_date,
        type: "resolution",
        title: `${pairLabel} — ${resolutionLabel}`,
        detail: row.resolution_note || `Divergence resolved: ${resolutionLabel}`,
        signalIds: [row.signal_a_id, row.signal_b_id],
        severity,
        resolution: row.resolution_direction || undefined,
      });
    }

    if (isDivergence) {
      const sevLabel =
        severity >= 7 ? "Critical" : severity >= 5 ? "Notable" : severity >= 3 ? "Moderate" : "Minor";

      events.push({
        id: `div-${row.id}`,
        date: row.observed_date,
        type: "divergence",
        title: `${pairLabel} Divergence`,
        detail: `${sevLabel} divergence (${severity.toFixed(1)}). ${row.signal_a_id}: ${row.signal_a_delta != null ? (row.signal_a_delta >= 0 ? "+" : "") + row.signal_a_delta : "N/A"}, ${row.signal_b_id}: ${row.signal_b_delta != null ? (row.signal_b_delta >= 0 ? "+" : "") + row.signal_b_delta : "N/A"}`,
        signalIds: [row.signal_a_id, row.signal_b_id],
        severity,
      });
    }
  }

  // Sort by date ascending
  events.sort((a, b) => a.date.localeCompare(b.date));

  return {
    events,
    dateRange: { from: fromDate, to: toDate },
    totalEvents: events.length,
  };
}
