// Resolution Engine — checks yesterday's persisted divergences against today's data.
// Passive: runs when user opens the scanner, not as a background job.

import {
  getYesterdayObservations,
  insertDivergence,
  resolveDivergence,
  type DivergenceRecord,
} from "@/lib/db/divergence-store";
import { detectDivergences } from "@/lib/expectations";
import { rankObservations } from "@/lib/ranking";
import type { MarketSnapshot } from "@/lib/market-data";

export interface ResolutionEvent {
  pairId: string;
  yesterdaySeverity: number;
  resolutionDirection: "realigned_bullish" | "realigned_bearish" | "persisted" | "faded";
  note: string;
}

export async function checkResolutions(
  userId: string,
  snapshot: MarketSnapshot
): Promise<ResolutionEvent[]> {
  const [yesterdayRecords, todayCrossSignal] = await Promise.all([
    getYesterdayObservations(userId),
    Promise.resolve(detectDivergences(snapshot.signals)),
  ]);

  const yesterdayDivergences = yesterdayRecords.filter(
    (r) => r.divergenceType === "divergence"
  );

  const events: ResolutionEvent[] = [];

  for (const record of yesterdayDivergences) {
    // Check if this pair is still diverging today
    const todayDiv = todayCrossSignal.divergences.find(
      (d) => d.id === record.signalPairId
    );

    if (!todayDiv) {
      // Was divergent yesterday, not divergent today — it resolved
      const sigA = snapshot.signals[record.signalAId];
      const sigB = snapshot.signals[record.signalBId];

      let direction: ResolutionEvent["resolutionDirection"] = "faded";
      if (sigB?.direction === "rising") direction = "realigned_bullish";
      else if (sigB?.direction === "falling") direction = "realigned_bearish";

      const note = sigB?.available
        ? `Divergence resolved. ${sigB.label} now ${sigB.direction} (${sigB.value}) — ${direction === "realigned_bullish" ? "bullish" : "bearish"} realignment.`
        : "Divergence faded. Signals no longer testable.";

      events.push({
        pairId: record.signalPairId,
        yesterdaySeverity: record.severityScore,
        resolutionDirection: direction,
        note,
      });

      // Persist resolution
      await resolveDivergence(userId, record.signalPairId, record.observedDate, direction, note);
    } else {
      // Still diverging — compute today's severity
      const todayRanked = rankObservations(snapshot.signals, [todayDiv]);
      const todayScore = todayRanked[0]?.severityScore ?? 0;
      events.push({
        pairId: record.signalPairId,
        yesterdaySeverity: record.severityScore,
        resolutionDirection: "persisted",
        note: `Divergence persists. Severity yesterday: ${record.severityScore}, today: ${todayScore.toFixed(1)}`,
      });
    }
  }

  // Persist today's divergences
  const today = new Date().toISOString().slice(0, 10);
  const ranked = rankObservations(snapshot.signals, todayCrossSignal.divergences);

  for (const d of ranked) {
    const sigA = snapshot.signals[d.expectation.signalA];
    const sigB = snapshot.signals[d.expectation.signalB];

    await insertDivergence({
      userId,
      signalPairId: d.id,
      observedDate: today,
      severityScore: d.severityScore,
      divergenceType: "divergence",
      signalAId: d.expectation.signalA,
      signalAValue: sigA?.rawValue ?? null,
      signalADelta: sigA?.delta ?? null,
      signalBId: d.expectation.signalB,
      signalBValue: sigB?.rawValue ?? null,
      signalBDelta: sigB?.delta ?? null,
      unexplainedMoveScore: null,
    });
  }

  return events;
}
