// Signal Registry — atomic data points that narratives are built from.
//
// A Signal = one measurable data point with a source.
// A Narrative = a collection of signals + an interpretation.
//
// Coverage = (signals with data) / (required signals)
//   ≥75% → Strongly Supported
//   ≥50% → Partially Supported
//   <50% → Insufficient Data

/* ——— Signal Definition ——— */

export type SignalSource = "coingecko" | "fred" | "farside" | "newsapi" | "manual";

export interface SignalDef {
  id: string;
  label: string;
  description: string;
  source: SignalSource;
  /** FRED series ID, CoinGecko coin ID, etc. */
  sourceId: string;
  /** For FRED: how to transform the observation value */
  transform?: "value" | "percent_change" | "inverse";
}

export interface SignalValue {
  signalId: string;
  label: string;
  value: string;
  rawValue: number | null;
  available: boolean;
}

/* ——— All Signals ——— */

export const SIGNAL_REGISTRY: Record<string, SignalDef> = {
  // CoinGecko — free, no key
  BTC_PRICE: {
    id: "BTC_PRICE",
    label: "BTC Price",
    description: "Current Bitcoin price in USD",
    source: "coingecko",
    sourceId: "bitcoin",
  },
  BTC_24H_CHANGE: {
    id: "BTC_24H_CHANGE",
    label: "BTC 24h Change",
    description: "Bitcoin 24-hour price change percentage",
    source: "coingecko",
    sourceId: "bitcoin",
  },
  ETH_PRICE: {
    id: "ETH_PRICE",
    label: "ETH Price",
    description: "Current Ethereum price in USD",
    source: "coingecko",
    sourceId: "ethereum",
  },

  // FRED — free API key required (https://fred.stlouisfed.org/docs/api/api_key.html)
  DXY_INDEX: {
    id: "DXY_INDEX",
    label: "DXY Index",
    description: "Trade-Weighted Broad Dollar Index (daily)",
    source: "fred",
    sourceId: "DTWEXBGS",
  },
  US10Y_YIELD: {
    id: "US10Y_YIELD",
    label: "US 10Y Yield",
    description: "10-Year Treasury Constant Maturity Rate",
    source: "fred",
    sourceId: "DGS10",
  },
  US2Y_YIELD: {
    id: "US2Y_YIELD",
    label: "US 2Y Yield",
    description: "2-Year Treasury Constant Maturity Rate",
    source: "fred",
    sourceId: "DGS2",
  },
  FED_FUNDS_RATE: {
    id: "FED_FUNDS_RATE",
    label: "Fed Funds Rate",
    description: "Effective Federal Funds Rate",
    source: "fred",
    sourceId: "FEDFUNDS",
  },
  GOLD_PRICE: {
    id: "GOLD_PRICE",
    label: "Gold Price",
    description: "Gold Fixing Price in USD (London PM)",
    source: "fred",
    sourceId: "GOLDAMGBD228NLBR",
  },

  // Farside — free, no key (ETF flow data)
  BTC_ETF_FLOW: {
    id: "BTC_ETF_FLOW",
    label: "BTC ETF Net Flow",
    description: "Daily net BTC ETF flow across all funds (Farside)",
    source: "farside",
    sourceId: "btc",
  },

  // NewsAPI — free tier
  MARKET_NEWS: {
    id: "MARKET_NEWS",
    label: "Market News",
    description: "Latest market headlines",
    source: "newsapi",
    sourceId: "crypto",
  },
};

/* ——— Coverage Assessment ——— */

export type CoverageLevel = "Strongly Supported" | "Partially Supported" | "Insufficient Data";

export function assessCoverage(availableCount: number, requiredCount: number): CoverageLevel {
  if (requiredCount === 0) return "Insufficient Data";
  const ratio = availableCount / requiredCount;
  if (ratio >= 0.75) return "Strongly Supported";
  if (ratio >= 0.5) return "Partially Supported";
  return "Insufficient Data";
}

export function coverageLabel(level: CoverageLevel): string {
  return level;
}

export function coverageDescription(level: CoverageLevel): string {
  switch (level) {
    case "Strongly Supported":
      return "Most required data signals are available — this narrative is well-grounded.";
    case "Partially Supported":
      return "Some signals are available but data gaps reduce conviction.";
    case "Insufficient Data":
      return "Too few signals available to assess this narrative credibly.";
  }
}
