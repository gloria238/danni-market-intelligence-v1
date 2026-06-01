// Narrative Registry — the product's knowledge base.
// LLM matches from this registry; it does NOT invent narratives.

export interface NarrativeDef {
  id: string;
  name: string;
  description: string;
  indicators: string[];
  promptContext: string;
}

export const NARRATIVE_REGISTRY: Record<string, NarrativeDef> = {
  ETF_FLOW: {
    id: "ETF_FLOW",
    name: "ETF Flows",
    description: "Significant capital flows through spot Bitcoin/ETH ETFs",
    indicators: ["BTC ETF Net Flow", "ETH ETF Net Flow", "ETF Volume", "IBIT / FBTC Flow"],
    promptContext:
      "Strong ETF inflows signal institutional demand. Track net daily flows (CoinShares, Farside data). Inflows > $100M/day are bullish; sustained outflows are bearish.",
  },

  RATE_CUT_EXPECTATIONS: {
    id: "RATE_CUT_EXPECTATIONS",
    name: "Rate Cut Expectations",
    description: "Market pricing increased probability of central bank rate cuts",
    indicators: ["FedWatch", "US10Y Yield", "DXY", "Fed Funds Futures"],
    promptContext:
      "Falling rate expectations weaken USD, lower bond yields, and boost risk assets. Track CME FedWatch for probability shifts.",
  },

  USD_WEAKNESS: {
    id: "USD_WEAKNESS",
    name: "USD Weakness",
    description: "Declining US Dollar index boosting dollar-denominated assets",
    indicators: ["DXY", "EUR/USD", "CNY/USD", "Gold Price"],
    promptContext:
      "A weak USD makes Bitcoin/commodities cheaper for foreign buyers and signals risk appetite.",
  },

  RISK_ON_SENTIMENT: {
    id: "RISK_ON_SENTIMENT",
    name: "Risk-On Sentiment",
    description: "Broad market shift toward risk assets (stocks up, VIX down)",
    indicators: ["SPX", "NASDAQ", "VIX", "Fear & Greed Index"],
    promptContext:
      "When equities rally and VIX is low, crypto typically benefits from spillover risk appetite.",
  },

  SHORT_SQUEEZE: {
    id: "SHORT_SQUEEZE",
    name: "Short Squeeze",
    description: "Rapid price increase forcing short sellers to cover positions",
    indicators: ["Funding Rate", "Open Interest", "Liquidations (Short)", "Basis"],
    promptContext:
      "Negative funding rates + high OI + large short liquidations = likely short squeeze. Unsustainable rally pattern.",
  },

  INSTITUTIONAL_BUYING: {
    id: "INSTITUTIONAL_BUYING",
    name: "Institutional Buying",
    description: "Large institutions accumulating spot or futures positions",
    indicators: ["CME OI", "ETF Flow", "Coinbase Premium", "OTC Volume"],
    promptContext:
      "CME OI rising + positive Coinbase premium = institutional accumulation. CME is the institutional venue; Coinbase premium shows US demand.",
  },

  REGULATORY_RELIEF: {
    id: "REGULATORY_RELIEF",
    name: "Regulatory Relief",
    description: "Positive regulatory developments reducing policy uncertainty",
    indicators: ["SEC Updates", "Legislation Progress", "Court Rulings", "Political Statements"],
    promptContext:
      "Positive regulatory news reduces the 'policy risk premium' baked into crypto assets. Track SEC statements, court rulings, and legislative progress.",
  },

  MACRO_EASING: {
    id: "MACRO_EASING",
    name: "Macro Easing",
    description: "Central bank liquidity expansion boosting all financial assets",
    indicators: ["Fed Balance Sheet", "Reverse Repo", "Global M2", "PBOC Liquidity"],
    promptContext:
      "Central bank balance sheet expansion increases global liquidity, which historically correlates with crypto bull markets.",
  },

  TECHNICAL_BREAKOUT: {
    id: "TECHNICAL_BREAKOUT",
    name: "Technical Breakout",
    description: "Price breaking through key technical levels triggering momentum",
    indicators: ["BTC Price vs MA200", "RSI", "Volume", "Key Resistance"],
    promptContext:
      "Break above key moving averages or resistance levels triggers momentum buying. Higher volume on breakout = higher conviction.",
  },

  GEOPOLITICAL_SAFE_HAVEN: {
    id: "GEOPOLITICAL_SAFE_HAVEN",
    name: "Geopolitical Safe Haven",
    description: "Geopolitical tensions driving demand for decentralized assets",
    indicators: ["Gold Price", "BTC/Gold Ratio", "Geopolitical Risk Index", "Oil Price"],
    promptContext:
      "During geopolitical crises, Bitcoin sometimes trades as a non-sovereign safe haven alongside gold.",
  },
};

// Helper: generate the prompt block describing available narratives
export function formatNarrativeRegistryForPrompt(): string {
  const entries = Object.values(NARRATIVE_REGISTRY);
  return entries
    .map(
      (n) =>
        `- ${n.id}: ${n.description}. Key indicators: ${n.indicators.join(", ")}. ${n.promptContext}`
    )
    .join("\n");
}

// Helper: map LLM narrative IDs back to full definitions
export function resolveNarrative(id: string): NarrativeDef | undefined {
  // Normalize: handle LLM variations
  const normalized = id.toUpperCase().replace(/\s+/g, "_");
  return NARRATIVE_REGISTRY[normalized] || NARRATIVE_REGISTRY[id];
}
