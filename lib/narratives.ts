// Narrative Registry — the product's knowledge base.
//
// Layer 2 of the reasoning stack:
//   SIGNALS → NARRATIVES → MEMO
//
// Each narrative defines two tiers of signals:
//   required  — ALL must be present. Missing ANY → "Not Assessable".
//   enhancing — nice-to-have. More = richer analysis, but not gating.
//
// Directional logic: each narrative explains what signal direction
// pattern supports it (e.g. "DXY ↓ + Gold ↑ → USD Weakness narrative").

import {
  type SignalValue,
  type CoverageLevel,
  type SignalDirection,
} from "@/lib/signals";
import { assessCoverage } from "@/lib/signals";

/* ——— Narrative definition ——— */

export interface NarrativeDef {
  id: string;
  name: string;
  description: string;
  /** Interpretive framework for the LLM */
  promptContext: string;
  /** Directional logic: what signal pattern supports this narrative */
  directionalLogic: string;
  /** Hard gate — ALL must be present. Missing ANY → Not Assessable. */
  requiredSignals: string[];
  /** Nice-to-have — enrich analysis but don't gate the narrative */
  enhancingSignals: string[];
}

export interface NarrativeAssessment {
  id: string;
  name: string;
  coverage: CoverageLevel;
  /** How many required signals are present / total required */
  requiredStatus: { available: number; total: number };
  /** Enhancing signals available */
  enhancingAvailable: number;
  enhancingTotal: number;
  /** Actual signal values */
  availableSignals: SignalValue[];
  /** Signal IDs that are missing */
  missingRequired: string[];
  /** Description of why this narrative is relevant given current signals */
  directionalContext: string;
}

/* ——— All Narratives ——— */

export const NARRATIVE_REGISTRY: Record<string, NarrativeDef> = {
  ETF_FLOW: {
    id: "ETF_FLOW",
    name: "ETF Flows",
    description: "Capital flows through spot Bitcoin ETFs driving price action",
    promptContext:
      "ETF flows are the most transparent institutional demand signal. Daily inflows > $100M indicate strong buying pressure. Weekly trends matter more than single-day prints.",
    directionalLogic:
      "BTC ETF Flow is the decisive signal. Positive flow → institutional demand. Negative flow → risk-off. Direction matters more than absolute magnitude.",
    requiredSignals: ["BTC_ETF_FLOW"],
    enhancingSignals: ["BTC_PRICE", "BTC_24H_CHANGE"],
  },

  RATE_CUT_EXPECTATIONS: {
    id: "RATE_CUT_EXPECTATIONS",
    name: "Rate Cut Expectations",
    description: "Market pricing increased probability of central bank rate cuts",
    promptContext:
      "When short-end yields fall faster than long-end (bull steepening), bond markets are pricing imminent cuts. Fed funds rate level + US2Y direction are the primary signals.",
    directionalLogic:
      "US2Y ↓ + Fed Funds ≤ current → easing priced in. US2Y ↑ + Fed Funds stable → no cuts expected. US10Y direction provides growth/inflation context.",
    requiredSignals: ["US2Y_YIELD", "US10Y_YIELD", "FED_FUNDS_RATE"],
    enhancingSignals: ["DXY_INDEX", "BTC_PRICE"],
  },

  USD_WEAKNESS: {
    id: "USD_WEAKNESS",
    name: "USD Weakness",
    description: "Declining US Dollar index boosting dollar-denominated assets",
    promptContext:
      "DXY is the USD strength gauge. DXY ↓ → USD cheaper globally → risk assets benefit. Gold ↑ concurrent with DXY ↓ confirms the dollar-weakness thesis (not just risk-on).",
    directionalLogic:
      "DXY ↓ = dollar weakening. Gold ↑ + DXY ↓ = confirmed dollar weakness (gold is the purest dollar alternative). DXY < 100 is structurally weak territory.",
    requiredSignals: ["DXY_INDEX"],
    enhancingSignals: ["GOLD_PRICE", "BTC_PRICE", "US10Y_YIELD"],
  },

  MACRO_EASING: {
    id: "MACRO_EASING",
    name: "Macro Easing",
    description: "Central bank liquidity expansion boosting all financial assets",
    promptContext:
      "Declining Fed funds rate + falling yields across the curve + weak USD = unambiguous macro easing. This is historically the most bullish backdrop for Bitcoin and gold.",
    directionalLogic:
      "Fed Funds ↓ or steady-low + US10Y ↓ + DXY ↓ → easing regime. All three pointing in same direction = high-conviction signal. Mixed directions = transition phase, lower conviction.",
    requiredSignals: ["FED_FUNDS_RATE", "US10Y_YIELD", "DXY_INDEX"],
    enhancingSignals: ["GOLD_PRICE", "US2Y_YIELD", "BTC_PRICE"],
  },

  INSTITUTIONAL_BUYING: {
    id: "INSTITUTIONAL_BUYING",
    name: "Institutional Buying",
    description: "Large institutions accumulating spot or ETF positions",
    promptContext:
      "Institutional flow is 'sticky money' — unlike leverage, it doesn't unwind overnight. ETF inflows are the primary observable signal. Price action alone is NOT evidence of institutional buying.",
    directionalLogic:
      "BTC ETF Flow positive + sustained > 3 days → institutional accumulation. BTC price direction provides context but is NOT direct evidence — any buyer can move price. ETF flow is the institutional fingerprint.",
    requiredSignals: ["BTC_ETF_FLOW"],
    enhancingSignals: ["BTC_PRICE", "BTC_24H_CHANGE"],
  },

  REGULATORY_RELIEF: {
    id: "REGULATORY_RELIEF",
    name: "Regulatory Relief",
    description: "Positive regulatory developments reducing policy uncertainty",
    promptContext:
      "Regulatory clarity reduces the 'policy risk premium' in crypto. This narrative is primarily news-driven — headlines about SEC, legislation, or court rulings are the direct evidence.",
    directionalLogic:
      "Positive regulatory headlines + BTC price response → regulatory relief narrative. BTC price alone is never evidence of regulatory developments.",
    requiredSignals: ["MARKET_NEWS"],
    enhancingSignals: ["BTC_PRICE"],
  },

  TECHNICAL_BREAKOUT: {
    id: "TECHNICAL_BREAKOUT",
    name: "Technical Breakout",
    description: "Price breaking through key technical levels triggering momentum buying",
    promptContext:
      "Price breakouts need magnitude confirmation. A move < 2% is noise, not a breakout. 24h change > 5% with sustained direction = possible breakout. Without volume data, caution is warranted.",
    directionalLogic:
      "BTC 24h change magnitude > 3% + consistent direction → potential breakout. Price direction + change magnitude are the only available signals; flag the absence of volume confirmation.",
    requiredSignals: ["BTC_PRICE", "BTC_24H_CHANGE"],
    enhancingSignals: [],
  },

  GEOPOLITICAL_SAFE_HAVEN: {
    id: "GEOPOLITICAL_SAFE_HAVEN",
    name: "Geopolitical Safe Haven",
    description: "Geopolitical tensions driving demand for decentralized and hard assets",
    promptContext:
      "Safe-haven bid signature: Gold ↑ + BTC ↑ + DXY also ↑ (flight to safety, not risk appetite). If DXY is falling while gold/BTC rise, that's dollar-weakness narrative, not geopolitical.",
    directionalLogic:
      "Gold ↑ + BTC ↑ + DXY stable/↑ = safe haven bid (capital fleeing to hard/decentralized assets). Gold ↑ + BTC ↑ + DXY ↓ = dollar weakness, not geopolitics. The DXY direction distinguishes these two narratives.",
    requiredSignals: ["GOLD_PRICE", "DXY_INDEX"],
    enhancingSignals: ["BTC_PRICE", "MARKET_NEWS"],
  },

  SHORT_SQUEEZE: {
    id: "SHORT_SQUEEZE",
    name: "Short Squeeze",
    description: "Forced short covering amplifying a price move",
    promptContext:
      "Short squeezes require: rapid price spike + evidence of prior short positioning. Without funding rate, OI, or liquidation data, this narrative CANNOT be assessed. Do NOT infer a short squeeze from price action alone — that is speculation.",
    directionalLogic:
      "Without funding rate, open interest, or liquidation data, this narrative is structurally Not Assessable. Price action alone is never sufficient — every price move would 'look like' a squeeze.",
    requiredSignals: ["BTC_PRICE"],
    enhancingSignals: ["BTC_24H_CHANGE"],
  },
};

/* ——— Hard-gate coverage assessment ——— */

export function assessNarrative(
  narrativeId: string,
  signals: Record<string, SignalValue>
): NarrativeAssessment | null {
  const def = NARRATIVE_REGISTRY[narrativeId];
  if (!def) return null;

  const availableRequired: SignalValue[] = [];
  const missingRequired: string[] = [];

  for (const sigId of def.requiredSignals) {
    const sv = signals[sigId];
    if (sv?.available) {
      availableRequired.push(sv);
    } else {
      missingRequired.push(sigId);
    }
  }

  const enhancingAvailable = def.enhancingSignals.filter(
    (id) => signals[id]?.available
  ).length;

  const coverage = assessCoverage(
    availableRequired.length,
    def.requiredSignals.length
  );

  // All available signals for this narrative (required + enhancing that exist)
  const allAvailable = [
    ...availableRequired,
    ...def.enhancingSignals
      .filter((id) => signals[id]?.available)
      .map((id) => signals[id]),
  ];

  // Build directional context from signal patterns
  const directionalContext = buildDirectionalContext(def, signals);

  return {
    id: def.id,
    name: def.name,
    coverage,
    requiredStatus: {
      available: availableRequired.length,
      total: def.requiredSignals.length,
    },
    enhancingAvailable,
    enhancingTotal: def.enhancingSignals.length,
    availableSignals: allAvailable,
    missingRequired,
    directionalContext,
  };
}

function buildDirectionalContext(
  def: NarrativeDef,
  signals: Record<string, SignalValue>
): string {
  const parts: string[] = [];

  for (const sigId of [...def.requiredSignals, ...def.enhancingSignals]) {
    const sv = signals[sigId];
    if (!sv?.available || !sv.direction) continue;

    const arrow =
      sv.direction === "rising" ? "↑" : sv.direction === "falling" ? "↓" : "→";
    parts.push(`${sv.label} ${arrow} at ${sv.value}`);
    if (sv.directionContext) parts.push(`  ${sv.directionContext}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No directional data available.";
}

export function buildNarrativeCoverageTable(
  signals: Record<string, SignalValue>
): {
  assessable: NarrativeAssessment[];
  notAssessable: NarrativeAssessment[];
} {
  const assessable: NarrativeAssessment[] = [];
  const notAssessable: NarrativeAssessment[] = [];

  for (const id of Object.keys(NARRATIVE_REGISTRY)) {
    const assessment = assessNarrative(id, signals);
    if (!assessment) continue;

    if (assessment.coverage === "Assessable") {
      assessable.push(assessment);
    } else {
      notAssessable.push(assessment);
    }
  }

  return { assessable, notAssessable };
}

/* ——— Prompt formatting ——— */

export function formatNarrativesForPrompt(
  signals: Record<string, SignalValue>
): string {
  const { assessable, notAssessable } = buildNarrativeCoverageTable(signals);

  let block = "";

  if (assessable.length > 0) {
    block +=
      "## ASSESSABLE NARRATIVES (all required signals present — use these)\n\n";
    for (const a of assessable) {
      const def = NARRATIVE_REGISTRY[a.id];
      const enhancingInfo =
        def.enhancingSignals.length > 0
          ? ` [enhancing: ${a.enhancingAvailable}/${a.enhancingTotal}]`
          : "";
      block += `### ${a.id}: ${def.description}${enhancingInfo}\n`;
      block += `Directional logic: ${def.directionalLogic}\n`;
      block += `Current signals:\n${a.directionalContext || "  Signal data present but directional context unavailable."}\n`;
      block += `Context: ${def.promptContext}\n\n`;
    }
  }

  if (notAssessable.length > 0) {
    block +=
      "## NOT ASSESSABLE (DO NOT USE — missing required signals)\n\n";
    for (const a of notAssessable) {
      const def = NARRATIVE_REGISTRY[a.id];
      block += `### ${a.id}: ${def.description}\n`;
      block += `❌ DO NOT USE. Missing required signals: ${a.missingRequired.join(", ")}\n`;
      if (a.availableSignals.length > 0) {
        const labels = a.availableSignals.map((s) => s.label).join(", ");
        block += `Available but insufficient: ${labels}\n`;
      }
      block += `\n`;
    }
  }

  return block || "No narrative framework available.";
}

// Backward compat
export function resolveNarrative(id: string): NarrativeDef | undefined {
  const normalized = id.toUpperCase().replace(/\s+/g, "_");
  return NARRATIVE_REGISTRY[normalized] || NARRATIVE_REGISTRY[id];
}
