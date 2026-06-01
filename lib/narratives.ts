// Narrative Registry — the product's knowledge base.
//
// A Narrative = human-interpretable story + required signals.
// Signals are the atomic data layer (see lib/signals.ts).
// Coverage is computed from (available signals / required signals) per narrative.

import { type SignalValue, assessCoverage, type CoverageLevel } from "@/lib/signals";

export interface NarrativeDef {
  id: string;
  name: string;
  description: string;
  promptContext: string;
  /** Signal IDs that MUST be available for this narrative to be well-supported */
  requiredSignals: string[];
}

export interface NarrativeAssessment {
  id: string;
  name: string;
  coverage: CoverageLevel;
  /** Ratio — how many required signals are available */
  coverageRatio: number;
  /** Matched signal values */
  availableSignals: SignalValue[];
  /** Signal IDs that are missing */
  missingSignals: string[];
  /** LLM-provided reasoning text */
  reasoning: string;
  /** LLM-provided confidence (now subordinated to coverage) */
  confidence: "High" | "Medium" | "Low";
}

export const NARRATIVE_REGISTRY: Record<string, NarrativeDef> = {
  ETF_FLOW: {
    id: "ETF_FLOW",
    name: "ETF Flows",
    description: "Capital flows through spot Bitcoin/ETH ETFs driving price action",
    promptContext:
      "ETF flows are the most transparent institutional demand signal. Inflows > $100M/day are unambiguously bullish; sustained outflows signal risk-off positioning.",
    requiredSignals: ["BTC_ETF_FLOW", "BTC_PRICE", "BTC_24H_CHANGE"],
  },

  RATE_CUT_EXPECTATIONS: {
    id: "RATE_CUT_EXPECTATIONS",
    name: "Rate Cut Expectations",
    description: "Market pricing increased probability of central bank rate cuts",
    promptContext:
      "When short-term yields fall faster than long-term (bull steepening), markets are pricing rate cuts. Falling US2Y + rising Fed funds futures probability = dovish pivot expected.",
    requiredSignals: ["US2Y_YIELD", "US10Y_YIELD", "FED_FUNDS_RATE", "DXY_INDEX"],
  },

  USD_WEAKNESS: {
    id: "USD_WEAKNESS",
    name: "USD Weakness",
    description: "Declining US Dollar index boosting dollar-denominated assets",
    promptContext:
      "A weak USD benefits Bitcoin, gold, and EM assets. DXY < 100 is structurally weak. Track DXY direction + gold correlation.",
    requiredSignals: ["DXY_INDEX", "GOLD_PRICE", "BTC_PRICE"],
  },

  RISK_ON_SENTIMENT: {
    id: "RISK_ON_SENTIMENT",
    name: "Risk-On Sentiment",
    description: "Broad shift toward risk assets — equities up, yields up, USD down",
    promptContext:
      "When BTC correlates positively with SPX and negatively with DXY, it's trading like a risk asset. Falling VIX + rising equities signal risk appetite.",
    requiredSignals: ["DXY_INDEX", "US10Y_YIELD", "BTC_PRICE"],
  },

  SHORT_SQUEEZE: {
    id: "SHORT_SQUEEZE",
    name: "Short Squeeze",
    description: "Rapid price increase forcing short sellers to cover",
    promptContext:
      "Short squeezes are unsustainable by nature. Key signatures: negative funding → rapid price spike → liquidations cascade. Typically resolves within 24-72 hours.",
    requiredSignals: ["BTC_PRICE", "BTC_24H_CHANGE"],
  },

  INSTITUTIONAL_BUYING: {
    id: "INSTITUTIONAL_BUYING",
    name: "Institutional Buying",
    description: "Large institutions accumulating spot or ETF positions",
    promptContext:
      "Institutional flow is 'sticky money' — unlike leverage, it doesn't unwind overnight. ETF inflows + strong BTC price action = likely institutional accumulation.",
    requiredSignals: ["BTC_ETF_FLOW", "BTC_PRICE", "BTC_24H_CHANGE"],
  },

  REGULATORY_RELIEF: {
    id: "REGULATORY_RELIEF",
    name: "Regulatory Relief",
    description: "Positive regulatory developments reducing policy uncertainty",
    promptContext:
      "Regulatory clarity reduces the 'policy risk premium' in crypto. Track SEC statements, court rulings, and legislative progress. This is primarily news-driven.",
    requiredSignals: ["MARKET_NEWS", "BTC_PRICE"],
  },

  MACRO_EASING: {
    id: "MACRO_EASING",
    name: "Macro Easing",
    description: "Central bank liquidity expansion boosting all financial assets",
    promptContext:
      "Declining Fed funds rate + falling yields + weak USD = macro easing regime. This is historically the most bullish backdrop for Bitcoin.",
    requiredSignals: ["FED_FUNDS_RATE", "US10Y_YIELD", "DXY_INDEX", "GOLD_PRICE"],
  },

  TECHNICAL_BREAKOUT: {
    id: "TECHNICAL_BREAKOUT",
    name: "Technical Breakout",
    description: "Price breaking through key technical levels",
    promptContext:
      "Breakouts need volume confirmation. A breakout on declining volume is a false signal. Track price action relative to recent range.",
    requiredSignals: ["BTC_PRICE", "BTC_24H_CHANGE"],
  },

  GEOPOLITICAL_SAFE_HAVEN: {
    id: "GEOPOLITICAL_SAFE_HAVEN",
    name: "Geopolitical Safe Haven",
    description: "Geopolitical tensions driving demand for decentralized assets",
    promptContext:
      "In geopolitical crises, Bitcoin sometimes trades as non-sovereign money alongside gold. Gold + BTC rising together with DXY also rising suggests safe-haven bid, not risk appetite.",
    requiredSignals: ["GOLD_PRICE", "BTC_PRICE", "DXY_INDEX", "MARKET_NEWS"],
  },
};

/* ——— Coverage Assessment ——— */

export function assessNarrative(
  narrativeId: string,
  signals: Record<string, SignalValue>
): NarrativeAssessment | null {
  const def = NARRATIVE_REGISTRY[narrativeId];
  if (!def) return null;

  const availableSignals: SignalValue[] = [];
  const missingSignals: string[] = [];

  for (const sigId of def.requiredSignals) {
    const sigVal = signals[sigId];
    if (sigVal?.available) {
      availableSignals.push(sigVal);
    } else {
      missingSignals.push(sigId);
    }
  }

  const coverageRatio = def.requiredSignals.length > 0
    ? availableSignals.length / def.requiredSignals.length
    : 0;
  const coverage = assessCoverage(availableSignals.length, def.requiredSignals.length);

  return {
    id: def.id,
    name: def.name,
    coverage,
    coverageRatio,
    availableSignals,
    missingSignals,
    reasoning: "",
    confidence: coverage === "Strongly Supported" ? "High" : coverage === "Partially Supported" ? "Medium" : "Low",
  };
}

export function buildNarrativeCoverageTable(
  signals: Record<string, SignalValue>
): {
  supported: NarrativeAssessment[];
  partial: NarrativeAssessment[];
  insufficient: NarrativeAssessment[];
} {
  const supported: NarrativeAssessment[] = [];
  const partial: NarrativeAssessment[] = [];
  const insufficient: NarrativeAssessment[] = [];

  for (const id of Object.keys(NARRATIVE_REGISTRY)) {
    const assessment = assessNarrative(id, signals);
    if (!assessment) continue;

    if (assessment.coverage === "Strongly Supported") supported.push(assessment);
    else if (assessment.coverage === "Partially Supported") partial.push(assessment);
    else insufficient.push(assessment);
  }

  return { supported, partial, insufficient };
}

/* ——— Prompt formatting ——— */

export function formatNarrativesForPrompt(
  signals: Record<string, SignalValue>
): string {
  const { supported, partial, insufficient } = buildNarrativeCoverageTable(signals);

  let block = "";

  if (supported.length > 0) {
    block += "## STRONGLY SUPPORTED NARRATIVES (prioritize these)\n";
    for (const a of supported) {
      const def = NARRATIVE_REGISTRY[a.id];
      block += `- ${a.id}: ${def.description} (${a.availableSignals.length}/${def.requiredSignals.length} signals available)\n  ${def.promptContext}\n`;
    }
    block += "\n";
  }

  if (partial.length > 0) {
    block += "## PARTIALLY SUPPORTED NARRATIVES (use cautiously — data gaps exist)\n";
    for (const a of partial) {
      const def = NARRATIVE_REGISTRY[a.id];
      block += `- ${a.id}: ${def.description} (${a.availableSignals.length}/${def.requiredSignals.length} signals available, missing: ${a.missingSignals.join(", ")})\n  ${def.promptContext}\n`;
    }
    block += "\n";
  }

  if (insufficient.length > 0) {
    block += "## INSUFFICIENT DATA NARRATIVES (DO NOT USE — no supporting data)\n";
    for (const a of insufficient) {
      const def = NARRATIVE_REGISTRY[a.id];
      block += `- ${a.id}: ${def.description} (${a.availableSignals.length}/${def.requiredSignals.length} signals available)\n  DO NOT include this narrative. Required signals unavailable.\n`;
    }
  }

  return block || "No narrative data available.";
}

// Manual backward compat
export function resolveNarrative(id: string): NarrativeDef | undefined {
  const normalized = id.toUpperCase().replace(/\s+/g, "_");
  return NARRATIVE_REGISTRY[normalized] || NARRATIVE_REGISTRY[id];
}
