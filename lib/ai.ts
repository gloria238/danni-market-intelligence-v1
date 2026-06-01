import OpenAI from "openai";
import {
  NARRATIVE_REGISTRY,
  assessNarrative,
  buildNarrativeCoverageTable,
  formatNarrativesForPrompt,
} from "@/lib/narratives";
import type { SignalDirection } from "@/lib/signals";
import type { MarketContext, MarketSnapshot } from "@/lib/market-data";
import { formatMarketContextForPrompt } from "@/lib/market-data";
import type { IntentResult } from "@/lib/intent";
import {
  detectDivergences,
  formatCrossSignalForPrompt,
  type DivergenceObservation,
  type CrossSignalAnalysis,
} from "@/lib/expectations";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

/* ——— Types ——— */

export interface NarrativeIndicator {
  label: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
  isLive: boolean;
  direction: SignalDirection | null;
}

export type ResearchNarrative = {
  id: string;
  name: string;
  coverage: "Assessable" | "Not Assessable";
  requiredStatus: { available: number; total: number };
  indicators: NarrativeIndicator[];
  reasoning: string;
  directionalAssessment: string;
};

export interface ResearchOutput {
  intent: string;
  summary: string;
  narratives: ResearchNarrative[];
  evidence: string[];
  risks: string[];
  signal_coverage: { available: number; total: number };
  market_context_used: boolean;
  premise_corrected: boolean;
  not_assessable: {
    id: string;
    name: string;
    missingSignals: string[];
    directionalLogic: string;
  }[];
  /** V1.5: Cross-signal divergence analysis */
  cross_signals: CrossSignalAnalysis;
}

/* ——— Prompt builder ——— */

function buildSystemPrompt(
  snapshot: MarketSnapshot,
  headlines: { title: string; source: string; url?: string; publishedAt?: string }[],
  intent: IntentResult,
  crossSignal: CrossSignalAnalysis
): string {
  const marketBlock = formatMarketContextForPrompt(snapshot, headlines as any);
  const narrativeBlock = formatNarrativesForPrompt(snapshot.signals);
  const divergenceBlock = formatCrossSignalForPrompt(crossSignal);

  return `You are a senior market analyst at a macro research firm. Your analysis is data-grounded — never speculative.

Your most valuable insight is often a DIVERGENCE — what SHOULD be happening vs what IS happening — not just narrative confirmation. A contradiction between signals is as informative as alignment.

## USER INTENT
Intent: ${intent.intent}
Question: "${intent.normalizedQuestion}"
${intent.factCheckNote || ""}

${divergenceBlock}

## NARRATIVE FRAMEWORK
${narrativeBlock}

${marketBlock}

## OUTPUT — Return ONLY valid JSON

{
  "summary": "3-4 sentence summary. LEAD with the most interesting finding — a divergence if one exists. If macro signals are supportive but BTC is declining, that IS the story. Reference specific values. Never write 'nothing significant' — there is always a story in the data relationships.",
  "narratives": [
    {
      "id": "NARRATIVE_ID",
      "reasoning": "1-2 sentences referencing specific data values. If the divergence analysis above reveals a contradiction, explain how that affects this narrative.",
      "directional_assessment": "1 sentence interpreting signal direction: e.g. 'Macro signals supportive (DXY ↓, US10Y ↓) but BTC not responding → crypto-specific headwind dominant'",
      "indicators": [
        { "label": "DXY", "value": "119.29", "signal": "bearish", "isLive": true, "direction": "falling" }
      ]
    }
  ],
  "evidence": ["Data point from Available signals", "Cross-signal observation"],
  "risks": ["What could invalidate the primary narrative", "The divergence could resolve in either direction"]
}

## STRICT RULES
1. ONLY use narratives from "ASSESSABLE" — never "NOT ASSESSABLE".
2. Lead the summary with the cross-signal story. A divergence is more interesting than a confirmation.
3. Each indicator MUST come from that narrative's signal set. Value must match Available data.
4. "isLive": true ONLY for values from Available signals.
5. "signal": "bullish"/"bearish"/"neutral" based on data direction.
6. Evidence items must reference specific values.
7. If a narrative's directional logic contradicts current data, say so — that's useful.`;
}

/* ——— Main ——— */

export async function generateResearch(
  question: string,
  marketCtx: MarketContext,
  intent: IntentResult
): Promise<ResearchOutput> {
  const snapshot: MarketSnapshot = marketCtx.snapshot ?? {
    timestamp: Date.now(),
    signals: {},
    availableCount: 0,
    totalCount: 0,
  };

  // Populate MARKET_NEWS signal
  if (marketCtx.headlines.length > 0 && snapshot.signals.MARKET_NEWS) {
    snapshot.signals.MARKET_NEWS = {
      signalId: "MARKET_NEWS",
      label: "Market News",
      value: `${marketCtx.headlines.length} headlines available`,
      rawValue: marketCtx.headlines.length,
      available: true,
      direction: null,
      directionContext: null,
    };
    snapshot.availableCount = Object.values(snapshot.signals).filter(
      (s) => s.available
    ).length;
  }

  // V1.5: Run divergence detection BEFORE LLM call — pure computation
  const crossSignal = detectDivergences(snapshot.signals);

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(
          snapshot,
          marketCtx.headlines,
          intent,
          crossSignal
        ),
      },
      { role: "user", content: intent.normalizedQuestion },
    ],
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from DeepSeek");

  const parsed = JSON.parse(raw);

  // Coverage table
  const { assessable, notAssessable } = buildNarrativeCoverageTable(
    snapshot.signals
  );
  const assessableIds = new Set(assessable.map((a) => a.id));

  // Validate narratives — hard gate
  const validatedNarratives: ResearchNarrative[] = Array.isArray(
    parsed.narratives
  )
    ? parsed.narratives
        .filter((n: any) => assessableIds.has(n.id || ""))
        .map((n: any) => {
          const def = NARRATIVE_REGISTRY[n.id];
          const assessment = assessNarrative(n.id, snapshot.signals);

          return {
            id: def?.id || n.id,
            name: def?.name || n.name || "Unknown",
            coverage: (assessment?.coverage ?? "Not Assessable") as
              | "Assessable"
              | "Not Assessable",
            requiredStatus: assessment?.requiredStatus ?? {
              available: 0,
              total: 0,
            },
            reasoning: n.reasoning || "",
            directionalAssessment: n.directional_assessment || "",
            indicators: Array.isArray(n.indicators)
              ? n.indicators
                  .filter((ind: any) => {
                    if (!def) return true;
                    const allSignals = [
                      ...def.requiredSignals,
                      ...def.enhancingSignals,
                    ];
                    const indLabel = String(ind.label || "").toLowerCase();
                    return allSignals.some((sigId) => {
                      const sigDef = snapshot.signals[sigId];
                      return (
                        sigDef?.label?.toLowerCase().includes(indLabel) ||
                        indLabel.includes(sigDef?.label?.toLowerCase() || "")
                      );
                    });
                  })
                  .map((ind: any) => ({
                    label: ind.label || "",
                    value: ind.value || "N/A",
                    signal: ["bullish", "bearish", "neutral"].includes(
                      ind.signal
                    )
                      ? ind.signal
                      : "neutral",
                    isLive: ind.isLive === true,
                    direction: ["rising", "falling", "stable"].includes(
                      ind.direction
                    )
                      ? (ind.direction as SignalDirection)
                      : null,
                  }))
              : [],
          };
        })
    : [];

  const notAssessableList = notAssessable.map((a) => ({
    id: a.id,
    name: a.name,
    missingSignals: a.missingRequired,
    directionalLogic: NARRATIVE_REGISTRY[a.id]?.directionalLogic ?? "",
  }));

  return {
    intent: intent.intent,
    summary: parsed.summary || "Analysis unavailable.",
    narratives: validatedNarratives,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    signal_coverage: {
      available: snapshot.availableCount,
      total: snapshot.totalCount,
    },
    market_context_used:
      snapshot.availableCount > 0 || marketCtx.headlines.length > 0,
    premise_corrected: intent.factCheckNote !== null,
    not_assessable: notAssessableList,
    cross_signals: crossSignal,
  };
}
