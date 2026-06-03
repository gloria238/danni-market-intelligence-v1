// Evidence Engine — "what evidence supports this explanation?"
//
// Layer 6 of the reasoning stack:
//   ... → RESEARCH HEALTH → EVIDENCE ENGINE → NARRATIVES → LLM
//
// Rule engine. Not ML. Not probability. Not prediction.
// Just evidence aggregation.
//
// Strength rules (pure counting, no weights):
//   Strong   = ≥3 supporting points AND 0 contradicting points
//   Moderate = ≥2 supporting points
//   Weak     = everything else

import type { SignalValue } from "@/lib/signals";
import type { DivergenceObservation } from "@/lib/expectations";
import type { AttributionResult } from "@/lib/attribution";
import type { PatternMatchResult } from "@/lib/patterns";

/* ——— Types ——— */

export type EvidenceStrength = "Strong" | "Moderate" | "Weak";

export interface EvidencePoint {
  signalId?: string;
  description: string;
}

export interface Explanation {
  id: string;
  label: string;
  strength: EvidenceStrength;
  supporting: EvidencePoint[];
  contradicting: EvidencePoint[];
  summary: string;
}

export interface EvidenceResult {
  divergenceId: string;
  topExplanation: Explanation;
}

/* ——— Evidence templates ——— */

interface EvidenceTemplate {
  id: string;
  label: string;
  /** Returns the explanation if conditions are met, null otherwise */
  check: (
    signals: Record<string, SignalValue>,
    divergences: DivergenceObservation[],
    attribution: AttributionResult,
    patterns: Record<string, PatternMatchResult>,
    headlines: any[]
  ) => Explanation | null;
}

const TEMPLATES: EvidenceTemplate[] = [
  {
    id: "etf_outflow",
    label: "ETF Outflow",
    check(signals, divergences, _attr, patterns) {
      const etfFlow = signals["BTC_ETF_FLOW"];
      const btcPrice = signals["BTC_PRICE"];
      const dxy = signals["DXY_INDEX"];

      if (!etfFlow?.available || etfFlow.rawValue == null) return null;
      if (etfFlow.rawValue >= -50) return null; // Not negative enough

      const supporting: EvidencePoint[] = [];
      const contradicting: EvidencePoint[] = [];

      // Flow magnitude
      const flowStr = etfFlow.value;
      supporting.push({
        signalId: "BTC_ETF_FLOW",
        description: `ETF Flow ${flowStr}`,
      });

      // BTC direction confirms
      if (btcPrice?.direction === "falling") {
        supporting.push({
          signalId: "BTC_PRICE",
          description: `BTC ${btcPrice.value} (declining — consistent with outflows)`,
        });
      }

      // DXY weakness contradicts (outflows shouldn't happen in weak dollar)
      if (dxy?.direction === "falling") {
        contradicting.push({
          signalId: "DXY_INDEX",
          description: `DXY declining (weak dollar typically supports BTC)`,
        });
      }

      // Historical pattern
      const dxyBtcPattern = patterns["DXY_BTC"];
      if (dxyBtcPattern && dxyBtcPattern.occurrences > 0 && dxyBtcPattern.bullishResolution > 60) {
        contradicting.push({
          description: `Historical precedent: ${dxyBtcPattern.bullishResolution}% bullish resolution for DXY-BTC divergence`,
        });
      }

      return {
        id: "etf_outflow",
        label: "ETF Outflow",
        strength: computeStrength(supporting.length, contradicting.length),
        supporting,
        contradicting,
        summary: "", // filled by LLM
      };
    },
  },

  {
    id: "macro_ignored",
    label: "Macro Tailwind Ignored",
    check(signals, divergences) {
      const dxy = signals["DXY_INDEX"];
      const btc = signals["BTC_PRICE"];
      const etfFlow = signals["BTC_ETF_FLOW"];

      // Must have DXY falling + BTC falling (divergence)
      if (!dxy?.available || dxy.direction !== "falling") return null;
      if (!btc?.available || btc.direction !== "falling") return null;

      const supporting: EvidencePoint[] = [];
      const contradicting: EvidencePoint[] = [];

      // Find the DXY_BTC divergence severity
      const dxyBtcDiv = divergences.find((d) => d.id === "DXY_BTC");
      const sevLabel = dxyBtcDiv?.severity || "notable";

      supporting.push({
        signalId: "DXY_INDEX",
        description: `DXY ${dxy.value} (falling — typically bullish for BTC)`,
      });
      supporting.push({
        signalId: "BTC_PRICE",
        description: `BTC ${btc.value} (falling — diverging from macro support)`,
      });
      supporting.push({
        description: `Divergence severity: ${sevLabel}`,
      });

      // ETF flow positive contradicts
      if (etfFlow?.available && etfFlow.rawValue != null && etfFlow.rawValue > 50) {
        contradicting.push({
          signalId: "BTC_ETF_FLOW",
          description: `ETF Flow ${etfFlow.value} (positive flows contradict macro-ignored thesis)`,
        });
      }

      return {
        id: "macro_ignored",
        label: "Macro Tailwind Ignored",
        strength: computeStrength(supporting.length, contradicting.length),
        supporting,
        contradicting,
        summary: "",
      };
    },
  },

  {
    id: "risk_off",
    label: "Risk-Off Rotation",
    check(signals) {
      const dxy = signals["DXY_INDEX"];
      const btc = signals["BTC_PRICE"];
      const gold = signals["GOLD_PRICE"];
      const etfFlow = signals["BTC_ETF_FLOW"];

      if (!dxy?.available || dxy.direction !== "rising") return null;
      if (!btc?.available || btc.direction !== "falling") return null;
      if (!gold?.available || gold.direction !== "rising") return null;

      const supporting: EvidencePoint[] = [];
      const contradicting: EvidencePoint[] = [];

      supporting.push({ signalId: "DXY_INDEX", description: `DXY ${dxy.value} (rising — risk-off signal)` });
      supporting.push({ signalId: "BTC_PRICE", description: `BTC ${btc.value} (declining in risk-off)` });
      supporting.push({ signalId: "GOLD_PRICE", description: `Gold ${gold.value} (rising — safe-haven demand)` });

      if (etfFlow?.available && etfFlow.rawValue != null && etfFlow.rawValue > 50) {
        contradicting.push({
          signalId: "BTC_ETF_FLOW",
          description: `ETF Flow ${etfFlow.value} (positive flows contradict risk-off)`,
        });
      }

      return {
        id: "risk_off",
        label: "Risk-Off Rotation",
        strength: computeStrength(supporting.length, contradicting.length),
        supporting,
        contradicting,
        summary: "",
      };
    },
  },

  {
    id: "forced_liquidation",
    label: "Forced Liquidation",
    check(_, __, attribution) {
      const btcChange = attribution.btcActualMove;
      const unexplainedRatio = attribution.unexplainedRatio;

      if (btcChange > -3 || unexplainedRatio < 0.7) return null;

      const supporting: EvidencePoint[] = [];
      const contradicting: EvidencePoint[] = [];

      supporting.push({
        description: `BTC ${btcChange.toFixed(1)}% (large negative move)`,
      });
      supporting.push({
        description: `Unexplained ratio: ${Math.round(unexplainedRatio * 100)}% (most of move unexplained by macro)`,
      });

      // Low vol would contradict liquidation
      if (Math.abs(btcChange) < 5) {
        contradicting.push({
          description: `Move magnitude < 5% — not extreme enough for forced liquidation`,
        });
      }

      return {
        id: "forced_liquidation",
        label: "Forced Liquidation",
        strength: computeStrength(supporting.length, contradicting.length),
        supporting,
        contradicting,
        summary: "",
      };
    },
  },

  {
    id: "regulatory",
    label: "Regulatory Overhang",
    check(signals, _, __, ___, headlines) {
      const news = signals["MARKET_NEWS"];
      if (!news?.available || headlines.length === 0) return null;

      const negativeKeywords = [
        "sec", "regulation", "ban", "crackdown", "lawsuit",
        "enforcement", "penalty", "fine", "restrict",
      ];
      const negativeHeadlines = headlines.filter((h: any) =>
        negativeKeywords.some((kw) => (h.title || "").toLowerCase().includes(kw))
      );

      if (negativeHeadlines.length === 0) return null;

      const supporting: EvidencePoint[] = [];
      const contradicting: EvidencePoint[] = [];

      supporting.push({
        signalId: "MARKET_NEWS",
        description: `${negativeHeadlines.length} negative regulatory headlines`,
      });

      // BTC rising would contradict
      const btc = signals["BTC_PRICE"];
      if (btc?.direction === "rising") {
        contradicting.push({
          signalId: "BTC_PRICE",
          description: "BTC rising despite negative headlines",
        });
      }

      return {
        id: "regulatory",
        label: "Regulatory Overhang",
        strength: computeStrength(supporting.length, contradicting.length),
        supporting,
        contradicting,
        summary: "",
      };
    },
  },
];

/* ——— Strength computation ——— */

function computeStrength(supportingCount: number, contradictingCount: number): EvidenceStrength {
  if (supportingCount >= 3 && contradictingCount === 0) return "Strong";
  if (supportingCount >= 2) return "Moderate";
  return "Weak";
}

/* ——— Main engine ——— */

export function generateEvidence(
  signals: Record<string, SignalValue>,
  divergences: DivergenceObservation[],
  attribution: AttributionResult,
  patterns: Record<string, PatternMatchResult>,
  headlines: any[] = []
): EvidenceResult | null {
  if (divergences.length === 0) return null;

  // Try each template against the top divergence
  const topDiv = divergences[0];
  const candidates: Explanation[] = [];

  for (const template of TEMPLATES) {
    const explanation = template.check(signals, divergences, attribution, patterns, headlines);
    if (explanation) candidates.push(explanation);
  }

  if (candidates.length === 0) {
    // No template matched — return a generic result for the LLM to fill
    return {
      divergenceId: topDiv.id,
      topExplanation: {
        id: "unexplained",
        label: "Unexplained Divergence",
        strength: "Weak",
        supporting: [
          {
            description: `${topDiv.signalA.label} ${topDiv.signalA.direction} + ${topDiv.signalB.label} ${topDiv.signalB.direction}`,
          },
        ],
        contradicting: [],
        summary: "",
      },
    };
  }

  // Pick best: most supporting points
  candidates.sort((a, b) => b.supporting.length - a.supporting.length);
  const top = candidates[0];

  return {
    divergenceId: topDiv.id,
    topExplanation: top,
  };
}

/* ——— Prompt formatting ——— */

export function formatEvidenceForPrompt(evidence: EvidenceResult | null): string {
  if (!evidence) {
    return "## EVIDENCE ANALYSIS\n\nNo evidence-based explanation available for current conditions.\n";
  }

  const e = evidence.topExplanation;

  let block = "## EVIDENCE ANALYSIS\n\n";
  block += `Top explanation for current divergence: **${e.label}** (${e.strength})\n\n`;

  if (e.supporting.length > 0) {
    block += "Supporting evidence:\n";
    for (const p of e.supporting) {
      block += `- ✓ ${p.description}\n`;
    }
    block += "\n";
  }

  if (e.contradicting.length > 0) {
    block += "Contradicting evidence:\n";
    for (const p of e.contradicting) {
      block += `- ✗ ${p.description}\n`;
    }
    block += "\n";
  }

  block += `### Instructions
You receive a ranked evidence-backed explanation for the current divergence. Reference it in the summary. Use the supporting evidence to explain WHY this explanation fits. Mention contradicting evidence as caveats. Do NOT invent new explanations or change the ranking.\n`;

  return block;
}
