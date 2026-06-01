// Signal Registry — atomic data points that narratives are built from.
//
// Layer 1 of the reasoning stack:
//   SIGNALS → NARRATIVES → MEMO
//
// Each signal has a direction (rising/falling/stable) derived from
// multi-observational context, not just a point value.

/* ——— Signal Definition ——— */

export type SignalSource = "coingecko" | "fred" | "farside" | "newsapi";

export type SignalDirection = "rising" | "falling" | "stable";

export interface SignalDef {
  id: string;
  label: string;
  description: string;
  source: SignalSource;
  /** FRED series ID, CoinGecko coin ID, Farside endpoint key, etc. */
  sourceId: string;
}

export interface SignalValue {
  signalId: string;
  label: string;
  /** Formatted display value, e.g. "$72,906" or "4.45%" */
  value: string;
  rawValue: number | null;
  available: boolean;
  /** Direction derived from multi-point context, not just sign */
  direction: SignalDirection | null;
  /** 1-sentence context, e.g. "↓ from 4.48% prior close" */
  directionContext: string | null;
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
  GOLD_PRICE: {
    id: "GOLD_PRICE",
    label: "Gold (XAUT)",
    description: "Gold price via tokenized proxy (tether-gold, 1 XAUT ≈ 1 troy oz)",
    source: "coingecko",
    sourceId: "tether-gold",
  },

  // FRED — free API key (https://fred.stlouisfed.org/docs/api/api_key.html)
  DXY_INDEX: {
    id: "DXY_INDEX",
    label: "DXY",
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
    description: "2-Year Treasury Constant Maturity Rate (policy-sensitive)",
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

  // Farside — free, no key
  BTC_ETF_FLOW: {
    id: "BTC_ETF_FLOW",
    label: "BTC ETF Flow",
    description: "Daily net BTC ETF flow across all US spot ETFs (Farside)",
    source: "farside",
    sourceId: "btc",
  },

  // NewsAPI — free tier
  MARKET_NEWS: {
    id: "MARKET_NEWS",
    label: "Market News",
    description: "Latest market headlines (newsapi.org)",
    source: "newsapi",
    sourceId: "crypto",
  },
};

/* ——— Coverage levels (hard gates) ——— */

export type CoverageLevel = "Assessable" | "Not Assessable";

export function assessCoverage(
  availableRequiredCount: number,
  requiredCount: number
): CoverageLevel {
  return availableRequiredCount === requiredCount
    ? "Assessable"
    : "Not Assessable";
}

export function coverageDescription(level: CoverageLevel): string {
  return level === "Assessable"
    ? "All required signals available — this narrative can be evaluated."
    : "One or more required signals unavailable — this narrative cannot be assessed without speculation.";
}
