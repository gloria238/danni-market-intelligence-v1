// Beta Coefficient Registry.
// Maps signal deltas to expected BTC price moves.
//
// β = expected % move in BTC per 1 unit move in source signal.
// Initial values: practitioner estimates, not backtested.
// Upgradable to rolling-correlation when signal_history DB exists (V3).

export interface BetaCoefficient {
  /** Source signal ID */
  from: string;
  /** Target signal ID (always BTC_PRICE for V2) */
  to: string;
  /** Expected % move in target per 1 unit move in source */
  beta: number;
  /** Direction of the relationship */
  direction: "inverse" | "direct";
  /** Human-readable */
  description: string;
}

export const BETA_REGISTRY: BetaCoefficient[] = [
  {
    from: "DXY_INDEX",
    to: "BTC_PRICE",
    beta: -2.5,
    direction: "inverse",
    description: "1 pt DXY drop → ~2.5% BTC rise (practitioner estimate)",
  },
  {
    from: "US10Y_YIELD",
    to: "BTC_PRICE",
    beta: -0.6,
    direction: "inverse",
    description: "1 bps yield drop → ~0.006% BTC rise (tiny direct effect; 25bps cut → ~15% historically)",
  },
  {
    from: "BTC_ETF_FLOW",
    to: "BTC_PRICE",
    beta: 0.3,
    direction: "direct",
    description: "$100M net inflow → ~0.3% BTC price impact (rough flow-pressure estimate)",
  },
  {
    from: "GOLD_PRICE",
    to: "BTC_PRICE",
    beta: 0.6,
    direction: "direct",
    description: "1% gold move → ~0.6% BTC move (weak positive correlation)",
  },
];

export function getBeta(fromSignal: string, toSignal: string): BetaCoefficient | undefined {
  return BETA_REGISTRY.find((b) => b.from === fromSignal && b.to === toSignal);
}

export function estimateBtcContribution(
  sourceDelta: number,
  sourceStdDev: number,
  beta: BetaCoefficient
): number {
  if (sourceStdDev === 0) return 0;
  // Normalize delta to "number of standard deviations", then apply beta
  const normalizedDelta = sourceDelta / sourceStdDev;
  return normalizedDelta * Math.abs(beta.beta) * (beta.direction === "inverse" ? -1 : 1);
}
