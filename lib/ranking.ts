// Severity Scoring Engine — ranks divergences 0.0–10.0.
//
// Formula: severity = w_correlation × w_magnitude × penalty
//   w_correlation: 3.0(strong) | 2.0(moderate) | 1.0(tentative)
//   w_magnitude:  min(|delta_A_norm| + |delta_B_norm|, 5.0)
//   penalty:      1.5 if divergence, 1.0 if confirmation

import type { DivergenceObservation } from "@/lib/expectations";
import { SIGNAL_REGISTRY } from "@/lib/signals";

export interface RankedDivergence extends DivergenceObservation {
  severityScore: number;
  magnitudeBreakdown: {
    signalADeltaNorm: number;
    signalBDeltaNorm: number;
    combinedMagnitude: number;
  };
}

export function computeSeverityScore(
  signals: Record<string, { rawValue: number | null; delta: number | null; available: boolean }>,
  obs: DivergenceObservation
): RankedDivergence {
  // Correlation weight
  const wCorrelation =
    obs.expectation.strength === "strong" ? 3.0
    : obs.expectation.strength === "moderate" ? 2.0
    : 1.0;

  // Magnitude: normalize each signal's delta by its typical std dev
  const defA = SIGNAL_REGISTRY[obs.expectation.signalA];
  const defB = SIGNAL_REGISTRY[obs.expectation.signalB];

  const sigA = signals[obs.expectation.signalA];
  const sigB = signals[obs.expectation.signalB];

  const deltaA = sigA?.delta ?? 0;
  const deltaB = sigB?.delta ?? 0;
  const stdDevA = defA?.typicalStdDev ?? 1;
  const stdDevB = defB?.typicalStdDev ?? 1;

  const deltaANorm = stdDevA > 0 ? Math.abs(deltaA) / stdDevA : 0;
  const deltaBNorm = stdDevB > 0 ? Math.abs(deltaB) / stdDevB : 0;
  const combinedMagnitude = Math.min(deltaANorm + deltaBNorm, 5.0);

  // Penalty: divergences are 1.5× more "interesting" than confirmations
  const penalty = obs.type === "divergence" ? 1.5 : 1.0;

  const raw = wCorrelation * combinedMagnitude * penalty;
  const severityScore = Math.round(Math.min(raw, 10.0) * 10) / 10;

  return {
    ...obs,
    severityScore,
    magnitudeBreakdown: {
      signalADeltaNorm: Math.round(deltaANorm * 100) / 100,
      signalBDeltaNorm: Math.round(deltaBNorm * 100) / 100,
      combinedMagnitude: Math.round(combinedMagnitude * 100) / 100,
    },
  };
}

export function rankObservations(
  signals: Record<string, { rawValue: number | null; delta: number | null; available: boolean }>,
  observations: DivergenceObservation[]
): RankedDivergence[] {
  return observations
    .map((obs) => computeSeverityScore(signals, obs))
    .sort((a, b) => b.severityScore - a.severityScore);
}

export function severityLabel(score: number): string {
  if (score >= 7.0) return "Critical";
  if (score >= 5.0) return "Notable";
  if (score >= 3.0) return "Moderate";
  return "Minor";
}

export function severityColor(score: number): string {
  if (score >= 7.0) return "text-danger border-danger/20 bg-danger-subtle";
  if (score >= 5.0) return "text-warning border-warning/20 bg-warning-subtle";
  if (score >= 3.0) return "text-warning/80 border-warning/15 bg-warning-subtle/50";
  return "text-muted border-border bg-surface";
}
