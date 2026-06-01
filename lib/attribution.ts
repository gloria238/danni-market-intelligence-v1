// Attribution Model — decomposes BTC price move into factor contributions.
//
// For each available signal with a beta to BTC, compute:
//   expected contribution = signal_delta × beta
//
// Then:
//   explained  = sum of all expected contributions
//   unexplained = BTC_actual_move - explained
//   score      = |unexplained| / max(|BTC_actual|, 0.01)

import {
  type BetaCoefficient,
  BETA_REGISTRY,
  getBeta,
  estimateBtcContribution,
} from "@/lib/betas";
import { SIGNAL_REGISTRY } from "@/lib/signals";

export interface FactorContribution {
  signalId: string;
  signalLabel: string;
  signalDelta: number;
  beta: number;
  expectedBtcContribution: number; // in % BTC move
  isAvailable: boolean;
}

export interface AttributionResult {
  btcActualMove: number; // BTC 24h change %
  factors: FactorContribution[];
  totalExplained: number;
  unexplained: number;
  /** |unexplained| / max(|btcActualMove|, 0.01) — >1.0 means more unexplained than explained */
  unexplainedRatio: number;
  availableFactors: number;
  totalFactors: number;
}

export function computeAttribution(
  btcChange24h: number | null,
  signals: Record<string, { delta: number | null; available: boolean }>,
): AttributionResult {
  const factors: FactorContribution[] = [];
  const btcActualMove = btcChange24h ?? 0;

  for (const betaDef of BETA_REGISTRY) {
    const sigVal = signals[betaDef.from];
    const sigDef = SIGNAL_REGISTRY[betaDef.from];
    const isAvailable = sigVal?.available === true && sigVal.delta != null;
    const signalDelta = sigVal?.delta ?? 0;

    let contribution = 0;
    if (isAvailable && sigDef) {
      contribution = estimateBtcContribution(signalDelta, sigDef.typicalStdDev, betaDef);
    }

    factors.push({
      signalId: betaDef.from,
      signalLabel: sigDef?.label ?? betaDef.from,
      signalDelta: Math.round(signalDelta * 1000) / 1000,
      beta: betaDef.beta,
      expectedBtcContribution: Math.round(contribution * 100) / 100,
      isAvailable,
    });
  }

  const totalExplained = Math.round(
    factors.reduce((sum, f) => sum + f.expectedBtcContribution, 0) * 100
  ) / 100;

  const unexplained = Math.round((btcActualMove - totalExplained) * 100) / 100;
  const unexplainedRatio = btcActualMove !== 0
    ? Math.round((Math.abs(unexplained) / Math.max(Math.abs(btcActualMove), 0.01)) * 100) / 100
    : 0;

  const availableFactors = factors.filter((f) => f.isAvailable).length;

  return {
    btcActualMove,
    factors,
    totalExplained,
    unexplained,
    unexplainedRatio,
    availableFactors,
    totalFactors: BETA_REGISTRY.length,
  };
}

export function attributionSummary(result: AttributionResult): string {
  if (result.availableFactors === 0) {
    return "No factor betas available to decompose the move. Need at least one factor signal with data.";
  }

  const parts: string[] = [];

  if (result.unexplainedRatio > 1.0) {
    parts.push(
      `⚠️ ${Math.abs(result.unexplained).toFixed(1)}% of the ${result.btcActualMove >= 0 ? "+" : ""}${result.btcActualMove.toFixed(2)}% BTC move is unexplained by available macro signals — more unexplained than explained. `
    );
  } else if (result.unexplainedRatio > 0.5) {
    parts.push(
      `A significant portion (${Math.abs(result.unexplained).toFixed(1)}%) of BTC's move is not attributable to tracked signals. `
    );
  } else {
    parts.push(
      `Most of BTC's ${result.btcActualMove >= 0 ? "+" : ""}${result.btcActualMove.toFixed(2)}% move can be attributed to tracked macro factors. `
    );
  }

  const contributors = result.factors
    .filter((f) => f.isAvailable && Math.abs(f.expectedBtcContribution) > 0.01)
    .sort((a, b) => Math.abs(b.expectedBtcContribution) - Math.abs(a.expectedBtcContribution));

  if (contributors.length > 0) {
    parts.push("Factor contributions: ");
    parts.push(
      contributors
        .map(
          (f) =>
            `${f.signalLabel}: ${f.expectedBtcContribution >= 0 ? "+" : ""}${f.expectedBtcContribution.toFixed(1)}%`
        )
        .join(" · ")
    );
  }

  if (result.unexplainedRatio > 0.8) {
    parts.push(
      "· The large unexplained component suggests crypto-specific factors (ETF flows, positioning, sentiment) are dominant."
    );
  }

  return parts.join("");
}
