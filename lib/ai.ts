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
  type CrossSignalAnalysis,
} from "@/lib/expectations";
import { rankObservations, type RankedDivergence } from "@/lib/ranking";
import { computeAttribution, type AttributionResult, attributionSummary } from "@/lib/attribution";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

/* ——— Types ——— */

export interface NarrativeIndicator {
  label: string; value: string; signal: "bullish" | "bearish" | "neutral";
  isLive: boolean; direction: SignalDirection | null;
}

export type ResearchNarrative = {
  id: string; name: string; coverage: "Assessable" | "Not Assessable";
  requiredStatus: { available: number; total: number };
  indicators: NarrativeIndicator[]; reasoning: string; directionalAssessment: string;
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
    id: string; name: string; missingSignals: string[]; directionalLogic: string;
  }[];
  cross_signals: CrossSignalAnalysis & { rankedDivergences: RankedDivergence[] };
  attribution: AttributionResult;
  attributionText: string;
}

/* ——— Prompt builder ——— */

function buildSystemPrompt(
  snapshot: MarketSnapshot,
  headlines: { title: string; source: string; url?: string; publishedAt?: string }[],
  intent: IntentResult,
  crossSignal: CrossSignalAnalysis,
  attr: AttributionResult
): string {
  const marketBlock = formatMarketContextForPrompt(snapshot, headlines as any);
  const narrativeBlock = formatNarrativesForPrompt(snapshot.signals);
  const divergenceBlock = formatCrossSignalForPrompt(crossSignal);
  const attrSummary = attributionSummary(attr);

  return `You are a senior market analyst at a macro research firm. Your analysis is data-grounded.

Your most valuable insight is often a DIVERGENCE — what SHOULD be happening vs what IS happening. A contradiction between signals is as informative as alignment.

## USER INTENT
Intent: ${intent.intent} | Question: "${intent.normalizedQuestion}"
${intent.factCheckNote || ""}

## MOVE ATTRIBUTION
${attrSummary}

${divergenceBlock}

## NARRATIVE FRAMEWORK
${narrativeBlock}

${marketBlock}

## OUTPUT — Return ONLY valid JSON
{
  "summary": "3-4 sentence summary. LEAD with the most interesting finding. If the attribution model shows most of the move is unexplained, THAT is the story. Reference specific values.",
  "narratives": [
    {
      "id": "NARRATIVE_ID",
      "reasoning": "1-2 sentences with specific values. Reference divergence/attribution analysis if relevant.",
      "directional_assessment": "1 sentence on signal direction pattern",
      "indicators": [
        { "label": "DXY", "value": "119.29", "signal": "bearish", "isLive": true, "direction": "falling" }
      ]
    }
  ],
  "evidence": ["Data point from Available signals", "Cross-signal observation"],
  "risks": ["Key invalidation risk", "Divergence could resolve in either direction"]
}

## STRICT RULES
1. ONLY use narratives from "ASSESSABLE". Never "NOT ASSESSABLE".
2. Lead with the cross-signal story. Divergence > confirmation.
3. Reference the attribution breakdown: what % is explained vs unexplained.
4. indicator values must match Available data. isLive:true only for real data.
5. signal: "bullish"/"bearish"/"neutral" based on data direction.`;
}

/* ——— Main ——— */

export async function generateResearch(
  question: string,
  marketCtx: MarketContext,
  intent: IntentResult
): Promise<ResearchOutput> {
  const snapshot: MarketSnapshot = marketCtx.snapshot ?? {
    timestamp: Date.now(), signals: {}, availableCount: 0, totalCount: 0,
  };

  // NEWS signal
  if (marketCtx.headlines.length > 0 && snapshot.signals.MARKET_NEWS) {
    snapshot.signals.MARKET_NEWS = {
      signalId: "MARKET_NEWS", label: "Market News",
      value: `${marketCtx.headlines.length} headlines`, rawValue: marketCtx.headlines.length,
      available: true, direction: null, directionContext: null, delta: null, previousValue: null,
    };
    snapshot.availableCount = Object.values(snapshot.signals).filter((s) => s.available).length;
  }

  // V1.6: Attribution (pure computation, before LLM)
  const btcChange24h = snapshot.signals.BTC_24H_CHANGE?.rawValue ?? null;
  const attribution = computeAttribution(btcChange24h, snapshot.signals);

  // V1.5: Cross-signal divergence (pure computation)
  const crossSignal = detectDivergences(snapshot.signals);

  // V1.6: Rank divergences by numeric severity
  const rankedDivergences = rankObservations(snapshot.signals, crossSignal.divergences);
  const rankedConfirmations = rankObservations(snapshot.signals, crossSignal.confirmedPatterns);

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: buildSystemPrompt(snapshot, marketCtx.headlines, intent, crossSignal, attribution) },
      { role: "user", content: intent.normalizedQuestion },
    ],
    temperature: 0.5, max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from DeepSeek");

  const parsed = JSON.parse(raw);

  const { assessable, notAssessable } = buildNarrativeCoverageTable(snapshot.signals);
  const assessableIds = new Set(assessable.map((a) => a.id));

  const validatedNarratives: ResearchNarrative[] = Array.isArray(parsed.narratives)
    ? parsed.narratives
        .filter((n: any) => assessableIds.has(n.id || ""))
        .map((n: any) => {
          const def = NARRATIVE_REGISTRY[n.id];
          const assessment = assessNarrative(n.id, snapshot.signals);
          return {
            id: def?.id || n.id,
            name: def?.name || n.name || "Unknown",
            coverage: (assessment?.coverage ?? "Not Assessable") as "Assessable" | "Not Assessable",
            requiredStatus: assessment?.requiredStatus ?? { available: 0, total: 0 },
            reasoning: n.reasoning || "",
            directionalAssessment: n.directional_assessment || "",
            indicators: Array.isArray(n.indicators)
              ? n.indicators
                  .filter((ind: any) => {
                    if (!def) return true;
                    const allSignals = [...def.requiredSignals, ...def.enhancingSignals];
                    const indLabel = String(ind.label || "").toLowerCase();
                    return allSignals.some((sigId) => {
                      const sd = snapshot.signals[sigId];
                      return sd?.label?.toLowerCase().includes(indLabel) || indLabel.includes(sd?.label?.toLowerCase() || "");
                    });
                  })
                  .map((ind: any) => ({
                    label: ind.label || "", value: ind.value || "N/A",
                    signal: ["bullish", "bearish", "neutral"].includes(ind.signal) ? ind.signal : "neutral",
                    isLive: ind.isLive === true,
                    direction: ["rising", "falling", "stable"].includes(ind.direction) ? (ind.direction as SignalDirection) : null,
                  }))
              : [],
          };
        })
    : [];

  const notAssessableList = notAssessable.map((a) => ({
    id: a.id, name: a.name, missingSignals: a.missingRequired,
    directionalLogic: NARRATIVE_REGISTRY[a.id]?.directionalLogic ?? "",
  }));

  return {
    intent: intent.intent,
    summary: parsed.summary || "Analysis unavailable.",
    narratives: validatedNarratives,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    signal_coverage: { available: snapshot.availableCount, total: snapshot.totalCount },
    market_context_used: snapshot.availableCount > 0 || marketCtx.headlines.length > 0,
    premise_corrected: intent.factCheckNote !== null,
    not_assessable: notAssessableList,
    cross_signals: { ...crossSignal, rankedDivergences },
    attribution,
    attributionText: attributionSummary(attribution),
  };
}
