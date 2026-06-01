// Signal Registry — atomic data points that narratives are built from.
//
// Layer 1 of the reasoning stack:
//   SIGNALS → DIVERGENCE → ATTRIBUTION → NARRATIVES → MEMO
//
// Each signal has direction + magnitude (delta) — used by ranking & attribution.

export type SignalSource = "coingecko" | "fred" | "farside" | "newsapi";
export type SignalDirection = "rising" | "falling" | "stable";

export interface SignalDef {
  id: string;
  label: string;
  description: string;
  source: SignalSource;
  sourceId: string;
  /** Typical daily standard deviation — used for magnitude normalization in severity scoring */
  typicalStdDev: number;
}

export interface SignalValue {
  signalId: string;
  label: string;
  value: string;
  rawValue: number | null;
  available: boolean;
  direction: SignalDirection | null;
  directionContext: string | null;
  /** Absolute delta from prior observation (null if no prior data) */
  delta: number | null;
  /** Prior observation value (null if no prior data) */
  previousValue: number | null;
}

export const SIGNAL_REGISTRY: Record<string, SignalDef> = {
  BTC_PRICE: {
    id: "BTC_PRICE",
    label: "BTC Price",
    description: "Current Bitcoin price in USD",
    source: "coingecko",
    sourceId: "bitcoin",
    typicalStdDev: 1500, // ~$1,500 daily std dev
  },
  BTC_24H_CHANGE: {
    id: "BTC_24H_CHANGE",
    label: "BTC 24h Change",
    description: "Bitcoin 24-hour price change percentage",
    source: "coingecko",
    sourceId: "bitcoin",
    typicalStdDev: 2.5, // ~2.5% daily std dev
  },
  ETH_PRICE: {
    id: "ETH_PRICE",
    label: "ETH Price",
    description: "Current Ethereum price in USD",
    source: "coingecko",
    sourceId: "ethereum",
    typicalStdDev: 100, // ~$100 daily std dev
  },
  GOLD_PRICE: {
    id: "GOLD_PRICE",
    label: "Gold (XAUT)",
    description: "Gold price via tokenized proxy (tether-gold)",
    source: "coingecko",
    sourceId: "tether-gold",
    typicalStdDev: 25, // ~$25 daily std dev
  },
  DXY_INDEX: {
    id: "DXY_INDEX",
    label: "DXY",
    description: "Trade-Weighted Broad Dollar Index (daily)",
    source: "fred",
    sourceId: "DTWEXBGS",
    typicalStdDev: 0.3, // ~0.3 pts daily std dev
  },
  US10Y_YIELD: {
    id: "US10Y_YIELD",
    label: "US 10Y Yield",
    description: "10-Year Treasury Constant Maturity Rate",
    source: "fred",
    sourceId: "DGS10",
    typicalStdDev: 0.04, // ~4 bps daily std dev
  },
  US2Y_YIELD: {
    id: "US2Y_YIELD",
    label: "US 2Y Yield",
    description: "2-Year Treasury Constant Maturity Rate",
    source: "fred",
    sourceId: "DGS2",
    typicalStdDev: 0.05, // ~5 bps daily std dev
  },
  FED_FUNDS_RATE: {
    id: "FED_FUNDS_RATE",
    label: "Fed Funds Rate",
    description: "Effective Federal Funds Rate",
    source: "fred",
    sourceId: "FEDFUNDS",
    typicalStdDev: 0.0, // Changes rarely — only at FOMC
  },
  BTC_ETF_FLOW: {
    id: "BTC_ETF_FLOW",
    label: "BTC ETF Flow",
    description: "Daily net BTC ETF flow across all US spot ETFs",
    source: "farside",
    sourceId: "btc",
    typicalStdDev: 150, // ~$150M daily std dev
  },
  MARKET_NEWS: {
    id: "MARKET_NEWS",
    label: "Market News",
    description: "Latest market headlines",
    source: "newsapi",
    sourceId: "crypto",
    typicalStdDev: 0,
  },
};

// Hard gate coverage
export type CoverageLevel = "Assessable" | "Not Assessable";

export function assessCoverage(available: number, required: number): CoverageLevel {
  return available === required ? "Assessable" : "Not Assessable";
}
