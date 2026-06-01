// Narrative Registry — the product's knowledge base.
// LLM matches from this registry; it does NOT invent narratives.
//
// Each narrative defines `requiredDataSources` — narrative can only appear
// when at least one required data source is available. This prevents
// "USD Weakness 65%" with N/A DXY data (the "trust me bro" problem).

export interface NarrativeDef {
  id: string;
  name: string;
  description: string;
  indicators: string[];
  promptContext: string;
  /** Data source keys — narrative only activates if ≥1 source has data available */
  requiredDataSources: string[];
}

export const NARRATIVE_REGISTRY: Record<string, NarrativeDef> = {
  ETF_FLOW: {
    id: "ETF_FLOW",
    name: "ETF Flows",
    description: "Significant capital flows through spot Bitcoin/ETH ETFs",
    indicators: ["BTC ETF Net Flow", "ETH ETF Net Flow", "ETF Volume", "IBIT / FBTC Flow"],
    promptContext:
      "Strong ETF inflows signal institutional demand. Track net daily flows (CoinShares, Farside data). Inflows > $100M/day are bullish; sustained outflows are bearish.",
    requiredDataSources: ["etf_data"],
  },

  RATE_CUT_EXPECTATIONS: {
    id: "RATE_CUT_EXPECTATIONS",
    name: "Rate Cut Expectations",
    description: "Market pricing increased probability of central bank rate cuts",
    indicators: ["FedWatch", "US10Y Yield", "DXY", "Fed Funds Futures"],
    promptContext:
      "Falling rate expectations weaken USD, lower bond yields, and boost risk assets. Track CME FedWatch for probability shifts.",
    requiredDataSources: ["macro_data"],
  },

  USD_WEAKNESS: {
    id: "USD_WEAKNESS",
    name: "USD Weakness",
    description: "Declining US Dollar index boosting dollar-denominated assets",
    indicators: ["DXY", "EUR/USD", "CNY/USD", "Gold Price"],
    promptContext:
      "A weak USD makes Bitcoin/commodities cheaper for foreign buyers and signals risk appetite.",
    requiredDataSources: ["macro_data"],
  },

  RISK_ON_SENTIMENT: {
    id: "RISK_ON_SENTIMENT",
    name: "Risk-On Sentiment",
    description: "Broad market shift toward risk assets (stocks up, VIX down)",
    indicators: ["SPX", "NASDAQ", "VIX", "Fear & Greed Index"],
    promptContext:
      "When equities rally and VIX is low, crypto typically benefits from spillover risk appetite.",
    requiredDataSources: ["macro_data"],
  },

  SHORT_SQUEEZE: {
    id: "SHORT_SQUEEZE",
    name: "Short Squeeze",
    description: "Rapid price increase forcing short sellers to cover positions",
    indicators: ["Funding Rate", "Open Interest", "Liquidations (Short)", "Basis"],
    promptContext:
      "Negative funding rates + high OI + large short liquidations = likely short squeeze. Unsustainable rally pattern.",
    requiredDataSources: ["derivatives_data"],
  },

  INSTITUTIONAL_BUYING: {
    id: "INSTITUTIONAL_BUYING",
    name: "Institutional Buying",
    description: "Large institutions accumulating spot or futures positions",
    indicators: ["CME OI", "ETF Flow", "Coinbase Premium", "OTC Volume"],
    promptContext:
      "CME OI rising + positive Coinbase premium = institutional accumulation. CME is the institutional venue; Coinbase premium shows US demand.",
    requiredDataSources: ["etf_data", "derivatives_data"],
  },

  REGULATORY_RELIEF: {
    id: "REGULATORY_RELIEF",
    name: "Regulatory Relief",
    description: "Positive regulatory developments reducing policy uncertainty",
    indicators: ["SEC Updates", "Legislation Progress", "Court Rulings", "Political Statements"],
    promptContext:
      "Positive regulatory news reduces the 'policy risk premium' baked into crypto assets. Track SEC statements, court rulings, and legislative progress.",
    requiredDataSources: ["news_data"],
  },

  MACRO_EASING: {
    id: "MACRO_EASING",
    name: "Macro Easing",
    description: "Central bank liquidity expansion boosting all financial assets",
    indicators: ["Fed Balance Sheet", "Reverse Repo", "Global M2", "PBOC Liquidity"],
    promptContext:
      "Central bank balance sheet expansion increases global liquidity, which historically correlates with crypto bull markets.",
    requiredDataSources: ["macro_data"],
  },

  TECHNICAL_BREAKOUT: {
    id: "TECHNICAL_BREAKOUT",
    name: "Technical Breakout",
    description: "Price breaking through key technical levels triggering momentum",
    indicators: ["BTC Price vs MA200", "RSI", "Volume", "Key Resistance"],
    promptContext:
      "Break above key moving averages or resistance levels triggers momentum buying. Higher volume on breakout = higher conviction.",
    requiredDataSources: ["price_data"],
  },

  GEOPOLITICAL_SAFE_HAVEN: {
    id: "GEOPOLITICAL_SAFE_HAVEN",
    name: "Geopolitical Safe Haven",
    description: "Geopolitical tensions driving demand for decentralized assets",
    indicators: ["Gold Price", "BTC/Gold Ratio", "Geopolitical Risk Index", "Oil Price"],
    promptContext:
      "During geopolitical crises, Bitcoin sometimes trades as a non-sovereign safe haven alongside gold.",
    requiredDataSources: ["macro_data", "news_data"],
  },
};

/** Which data sources are currently available? */
export function getAvailableDataSources(hasBtcPrice: boolean, hasNews: boolean): Set<string> {
  const available = new Set<string>();

  if (hasBtcPrice) {
    available.add("price_data");
    available.add("derivatives_data"); // if we can get price, derivatives likely available too
  }

  if (hasNews) {
    available.add("news_data");
  }

  // Free tier doesn't have SPX/DXY/US10Y — these are always unavailable
  // Uncomment when premium data API is added:
  // available.add("macro_data");
  // available.add("etf_data");

  return available;
}

/** Filter registry to only narratives viable with current data availability */
export function getActiveNarrativeIds(availableSources: Set<string>): Set<string> {
  const active = new Set<string>();

  for (const [id, def] of Object.entries(NARRATIVE_REGISTRY)) {
    const hasAnySource = def.requiredDataSources.some((src) => availableSources.has(src));
    if (hasAnySource) {
      active.add(id);
    }
  }

  // If nothing is available (no real-time data at all), ALL narratives are "low confidence" but still allowed
  if (active.size === 0) {
    return new Set(Object.keys(NARRATIVE_REGISTRY));
  }

  return active;
}

// Helper: generate prompt block for ONLY active narratives
export function formatActiveNarrativesForPrompt(availableSources: Set<string>): {
  block: string;
  activeIds: Set<string>;
} {
  const activeIds = getActiveNarrativeIds(availableSources);
  const entries = Object.values(NARRATIVE_REGISTRY).filter((n) => activeIds.has(n.id));

  let block = entries
    .map(
      (n) =>
        `- ${n.id}: ${n.description}. Key indicators: ${n.indicators.join(", ")}. ${n.promptContext}`
    )
    .join("\n");

  // List suppressed narratives
  const suppressed = Object.values(NARRATIVE_REGISTRY).filter((n) => !activeIds.has(n.id));
  if (suppressed.length > 0) {
    block +=
      "\n\n## NARRATIVES SUPPRESSED (INSUFFICIENT DATA)\n" +
      suppressed
        .map(
          (n) =>
            `- ${n.id}: UNAVAILABLE — data sources missing: ${n.requiredDataSources.join(", ")}. DO NOT use this narrative.`
        )
        .join("\n");
  }

  return { block, activeIds };
}

// Backward-compatible wrapper
export function formatNarrativeRegistryForPrompt(): string {
  const { block } = formatActiveNarrativesForPrompt(
    new Set(Object.keys(NARRATIVE_REGISTRY))
  );
  return block;
}

// Helper: map LLM narrative IDs back to full definitions
export function resolveNarrative(id: string): NarrativeDef | undefined {
  const normalized = id.toUpperCase().replace(/\s+/g, "_");
  return NARRATIVE_REGISTRY[normalized] || NARRATIVE_REGISTRY[id];
}
