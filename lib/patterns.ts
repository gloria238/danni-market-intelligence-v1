// Pattern Matching Engine — answers "what happened before when conditions looked like this?"
//
// Layer 4 of the reasoning stack:
//   SIGNALS → DIVERGENCE → ATTRIBUTION → HISTORICAL MEMORY → PATTERN MATCHING → ...
//
// Pure SQL + TypeScript computation. No LLM. No normalization. No composite scores.
// Every number traceable to row counts in signal_history.
// "69% bullish" = "69 of 100 matching days saw BTC higher at T+3."

import type { SignalValue, SignalDirection } from "@/lib/signals";
import type { DivergenceObservation } from "@/lib/expectations";
import { getMatchingDays, getSignalHistory, getHistoryAge, type SignalPoint } from "@/lib/db/signal-history-store";

/* ——— Types ——— */

export interface PatternMatchResult {
  pairId: string;
  currentDescription: string;
  occurrences: number;
  bullishResolution: number;
  bearishResolution: number;
  neutralResolution: number;
  avgBtcMove: number;
  medianResolutionDays: number;
  recentMatches: Array<{
    date: string;
    btcMoveAfter: number;
    daysToResolve: number;
  }>;
  note?: string;
}

export interface PairHistoricalStats {
  pairId: string;
  signalALabel: string;
  signalBLabel: string;
  totalOccurrences: number;
  bullishResolutionRate: number;
  bearishResolutionRate: number;
  avgDurationDays: number;
}

/* ——— Helpers ——— */

const MIN_HISTORY_DAYS = 7;

function formatDescription(
  labelA: string,
  dirA: SignalDirection,
  labelB: string,
  dirB: SignalDirection
): string {
  const arrow = (d: SignalDirection) =>
    d === "rising" ? "↑" : d === "falling" ? "↓" : "→";
  return `${labelA} ${arrow(dirA)}, ${labelB} ${arrow(dirB)}`;
}

function classifyResolution(
  btcMove: number
): "bullish" | "bearish" | "neutral" {
  if (btcMove > 0.5) return "bullish";
  if (btcMove < -0.5) return "bearish";
  return "neutral";
}

/* ——— Core: match a single signal pair pattern against history ——— */

export async function matchHistoricalPattern(
  pairId: string,
  dirA: SignalDirection,
  dirB: SignalDirection,
  signalAId: string,
  signalBId: string,
  lookbackDays: number = 365
): Promise<PatternMatchResult> {
  const { totalDays } = await getHistoryAge();

  if (totalDays < MIN_HISTORY_DAYS) {
    return {
      pairId,
      currentDescription: "",
      occurrences: 0,
      bullishResolution: 0,
      bearishResolution: 0,
      neutralResolution: 0,
      avgBtcMove: 0,
      medianResolutionDays: 0,
      recentMatches: [],
      note: `Historical database building — ${totalDays} days recorded, need ${MIN_HISTORY_DAYS}+ for meaningful comparison.`,
    };
  }

  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - lookbackDays * 86400000)
    .toISOString()
    .slice(0, 10);

  // Find matching days
  const matchingSnapshots = await getMatchingDays(
    signalAId,
    dirA === "rising" ? "rising" : "falling",
    signalBId,
    dirB === "rising" ? "rising" : "falling",
    fromDate,
    toDate
  );

  if (matchingSnapshots.length === 0) {
    return {
      pairId,
      currentDescription: "",
      occurrences: 0,
      bullishResolution: 0,
      bearishResolution: 0,
      neutralResolution: 0,
      avgBtcMove: 0,
      medianResolutionDays: 0,
      recentMatches: [],
      note: `No matching pattern found in the past ${lookbackDays} days.`,
    };
  }

  // For each matching day, check BTC price at T+3
  const resolutions: Array<{
    date: string;
    btcMoveAfter: number;
    daysToResolve: number;
    type: "bullish" | "bearish" | "neutral";
  }> = [];

  for (const snapshot of matchingSnapshots) {
    const matchDate = snapshot[0]?.recordedAt;
    if (!matchDate) continue;

    // Get BTC price on match date
    const btcPoint = snapshot.find((p) => p.signalId === "BTC_PRICE");
    if (!btcPoint) continue;

    // Get BTC price 3 days later
    const targetDate = new Date(matchDate);
    targetDate.setDate(targetDate.getDate() + 3);
    const targetDateStr = targetDate.toISOString().slice(0, 10);

    const btcHistory = await getSignalHistory("BTC_PRICE", targetDateStr, targetDateStr);
    const futureBtc = btcHistory[0];

    if (futureBtc) {
      const btcMove =
        ((futureBtc.value - btcPoint.value) / btcPoint.value) * 100;
      resolutions.push({
        date: matchDate,
        btcMoveAfter: Math.round(btcMove * 100) / 100,
        daysToResolve: 3,
        type: classifyResolution(btcMove),
      });
    }
  }

  const total = resolutions.length;
  const bullish = resolutions.filter((r) => r.type === "bullish").length;
  const bearish = resolutions.filter((r) => r.type === "bearish").length;
  const neutral = resolutions.filter((r) => r.type === "neutral").length;

  const avgBtcMove =
    total > 0
      ? Math.round(
          (resolutions.reduce((s, r) => s + r.btcMoveAfter, 0) / total) * 100
        ) / 100
      : 0;

  const sortedDays = resolutions.map((r) => r.daysToResolve).sort((a, b) => a - b);
  const medianDays =
    total > 0
      ? sortedDays.length % 2 === 0
        ? (sortedDays[total / 2 - 1] + sortedDays[total / 2]) / 2
        : sortedDays[Math.floor(total / 2)]
      : 0;

  return {
    pairId,
    currentDescription: "",
    occurrences: total,
    bullishResolution: total > 0 ? Math.round((bullish / total) * 100) : 0,
    bearishResolution: total > 0 ? Math.round((bearish / total) * 100) : 0,
    neutralResolution: total > 0 ? Math.round((neutral / total) * 100) : 0,
    avgBtcMove,
    medianResolutionDays: Math.round(medianDays * 10) / 10,
    recentMatches: resolutions.slice(-5).map((r) => ({
      date: r.date,
      btcMoveAfter: r.btcMoveAfter,
      daysToResolve: r.daysToResolve,
    })),
  };
}

/* ——— Aggregation: stats for one pair across all direction combos ——— */

export async function getPairHistoricalStats(
  pairId: string,
  signalAId: string,
  signalBId: string
): Promise<PairHistoricalStats> {
  const { totalDays } = await getHistoryAge();

  if (totalDays < MIN_HISTORY_DAYS) {
    return {
      pairId,
      signalALabel: signalAId,
      signalBLabel: signalBId,
      totalOccurrences: 0,
      bullishResolutionRate: 0,
      bearishResolutionRate: 0,
      avgDurationDays: 0,
    };
  }

  // Match the pair diverging (inverse/direct depends on pair)
  // We check both rising+falling and falling+rising combos as divergences
  const results: PatternMatchResult[] = [];

  const rising = await matchHistoricalPattern(pairId, "rising", "falling", signalAId, signalBId);
  if (rising.occurrences > 0) results.push(rising);

  const falling = await matchHistoricalPattern(pairId, "falling", "rising", signalAId, signalBId);
  if (falling.occurrences > 0) results.push(falling);

  const totalOccurrences = results.reduce((s, r) => s + r.occurrences, 0);
  const weightedBullish = results.reduce(
    (s, r) => s + (r.bullishResolution / 100) * r.occurrences,
    0
  );
  const weightedBearish = results.reduce(
    (s, r) => s + (r.bearishResolution / 100) * r.occurrences,
    0
  );
  const weightedDuration = results.reduce(
    (s, r) => s + r.medianResolutionDays * r.occurrences,
    0
  );

  return {
    pairId,
    signalALabel: signalAId,
    signalBLabel: signalBId,
    totalOccurrences,
    bullishResolutionRate:
      totalOccurrences > 0
        ? Math.round((weightedBullish / totalOccurrences) * 100)
        : 0,
    bearishResolutionRate:
      totalOccurrences > 0
        ? Math.round((weightedBearish / totalOccurrences) * 100)
        : 0,
    avgDurationDays:
      totalOccurrences > 0
        ? Math.round((weightedDuration / totalOccurrences) * 10) / 10
        : 0,
  };
}

/* ——— All pairs ——— */

import { EXPECTATION_REGISTRY } from "@/lib/expectations";
import { SIGNAL_REGISTRY } from "@/lib/signals";

export async function getAllPairStats(): Promise<PairHistoricalStats[]> {
  const stats: PairHistoricalStats[] = [];

  for (const exp of EXPECTATION_REGISTRY) {
    const stat = await getPairHistoricalStats(
      exp.id,
      exp.signalA,
      exp.signalB
    );
    // Override with human labels
    stat.signalALabel = SIGNAL_REGISTRY[exp.signalA]?.label ?? exp.signalA;
    stat.signalBLabel = SIGNAL_REGISTRY[exp.signalB]?.label ?? exp.signalB;
    stats.push(stat);
  }

  return stats.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

/* ——— Batch: match all current divergences against history ——— */

export async function matchCurrentDivergences(
  divergences: DivergenceObservation[],
  signals: Record<string, SignalValue>
): Promise<Record<string, PatternMatchResult>> {
  const results: Record<string, PatternMatchResult> = {};

  for (const div of divergences) {
    const dirA = div.signalA.direction;
    const dirB = div.signalB.direction;
    if (!dirA || !dirB || dirA === "stable" || dirB === "stable") continue;

    const signalAId = div.expectation.signalA;
    const signalBId = div.expectation.signalB;

    const match = await matchHistoricalPattern(
      div.id,
      dirA,
      dirB,
      signalAId,
      signalBId
    );

    const labelA = SIGNAL_REGISTRY[signalAId]?.label ?? signalAId;
    const labelB = SIGNAL_REGISTRY[signalBId]?.label ?? signalBId;
    match.currentDescription = formatDescription(labelA, dirA, labelB, dirB);
    results[div.id] = match;
  }

  return results;
}

/* ——— Prompt formatting ——— */

export function formatPatternsForPrompt(
  matches: Record<string, PatternMatchResult>
): string {
  const entries = Object.entries(matches).filter(
    ([, m]) => m.occurrences > 0
  );

  if (entries.length === 0) {
    return "## HISTORICAL PATTERN ANALYSIS\n\nNo historical pattern data available yet. The signal history database is building — check back after daily scans accumulate.\n";
  }

  let block = "## HISTORICAL PATTERN ANALYSIS\n\n";
  block += `Comparing current signal states against ${entries.length} historical patterns.\n\n`;

  for (const [, m] of entries) {
    block += `### ${m.pairId}: ${m.currentDescription}\n`;
    block += `- Occurrences: ${m.occurrences} in the past year\n`;
    block += `- Bullish resolution: ${m.bullishResolution}% · Bearish: ${m.bearishResolution}% · Neutral: ${m.neutralResolution}%\n`;
    block += `- Average BTC move after: ${m.avgBtcMove >= 0 ? "+" : ""}${m.avgBtcMove}%\n`;
    block += `- Median resolution: ${m.medianResolutionDays} days\n`;

    if (m.recentMatches.length > 0) {
      block += `- Recent matches:\n`;
      for (const rm of m.recentMatches.slice(-3)) {
        block += `  ${rm.date}: BTC ${rm.btcMoveAfter >= 0 ? "+" : ""}${rm.btcMoveAfter}% after ${rm.daysToResolve}d\n`;
      }
    }
    block += "\n";
  }

  block += `### Instructions
When historical pattern data is available, reference it in the summary. A divergence that has resolved bullishly 69% of the time IS the story. When no historical data exists yet, do not mention it — focus on the current signals.\n`;

  return block;
}
