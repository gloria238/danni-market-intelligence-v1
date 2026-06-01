import OpenAI from "openai";
import {
  NARRATIVE_REGISTRY,
  assessNarrative,
  buildNarrativeCoverageTable,
  formatNarrativesForPrompt,
  type NarrativeAssessment,
} from "@/lib/narratives";
import type { SignalValue, CoverageLevel } from "@/lib/signals";
import type { MarketContext, MarketSnapshot } from "@/lib/market-data";
import { formatMarketContextForPrompt } from "@/lib/market-data";
import type { IntentResult } from "@/lib/intent";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ——— Types ———

export interface NarrativeIndicator {
  label: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
  /** Whether this indicator came from real data or LLM estimation */
  isLive: boolean;
}

export type ResearchNarrative = {
  id: string;
  name: string;
  coverage: CoverageLevel;
  coverageRatio: number;
  indicators: NarrativeIndicator[];
  reasoning: string;
};

export interface ResearchOutput {
  intent: string;
  summary: string;
  narratives: ResearchNarrative[];
  evidence: string[];
  risks: string[];
  /** Overall signal coverage */
  signal_coverage: { available: number; total: number };
  market_context_used: boolean;
  premise_corrected: boolean;
  /** Narratives excluded due to insufficient data */
  insufficient_data_narratives: { id: string; name: string; missingSignals: string[] }[];
}

// ——— Prompt builder ———

function buildSystemPrompt(
  snapshot: MarketSnapshot,
  headlines: { title: string; source: string; url?: string; publishedAt?: string }[],
  intent: IntentResult
): string {
  const marketBlock = formatMarketContextForPrompt(snapshot, headlines as any);
  const narrativeBlock = formatNarrativesForPrompt(snapshot.signals);

  return `You are a senior market analyst at a top-tier macro research firm. Your analysis is grounded in data — not speculation.

## USER INTENT
Inferred intent: ${intent.intent}
Original question: "${intent.normalizedQuestion}"
${intent.factCheckNote || ""}

## NARRATIVE FRAMEWORK
${narrativeBlock}

${marketBlock}

## OUTPUT — Return ONLY valid JSON

{
  "summary": "3-4 sentence executive summary. Reference specific data values from the Available Data above. If the user's premise is incorrect, address this in the first sentence then provide the analysis they actually need.",
  "narratives": [
    {
      "id": "NARRATIVE_ID_FROM_REGISTRY",
      "reasoning": "1 sentence referencing specific available data points",
      "indicators": [
        { "label": "BTC Price", "value": "$72,906", "signal": "bearish", "isLive": true },
        { "label": "ETF Flow Estimate", "value": "+$200M (per reports)", "signal": "bullish", "isLive": false }
      ]
    }
  ],
  "evidence": ["Data point 1 from the Available Data", "Data point 2"],
  "risks": ["What could invalidate this thesis 1", "What could invalidate this thesis 2"]
}

## RULES
1. Use narratives from the framework above. Prioritize "STRONGLY SUPPORTED" narratives first.
2. Never use "INSUFFICIENT DATA" narratives — they have no data backing.
3. For each indicator: set "isLive": true if the value came from the Available Data above, false if you estimated it.
4. Signal must be "bullish", "bearish", or "neutral" based on the actual data direction.
5. evidence items must reference specific data from the Available Data section.
6. If data is sparse, say so in the summary. Don't invent certainty.`;
}

// ——— Main ———

export async function generateResearch(
  question: string,
  marketCtx: MarketContext,
  intent: IntentResult
): Promise<ResearchOutput> {
  const snapshot = marketCtx.snapshot ?? {
    timestamp: Date.now(),
    signals: {},
    availableCount: 0,
    totalCount: 0,
  };

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: buildSystemPrompt(snapshot, marketCtx.headlines, intent) },
      { role: "user", content: intent.normalizedQuestion },
    ],
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from DeepSeek");

  const parsed = JSON.parse(raw);

  // Build coverage analysis
  const { insufficient } = buildNarrativeCoverageTable(snapshot.signals);

  // Validate narratives against coverage
  const validatedNarratives: ResearchNarrative[] = Array.isArray(parsed.narratives)
    ? parsed.narratives
        .filter((n: any) => {
          // Drop insufficient-data narratives the LLM might have included anyway
          const def = NARRATIVE_REGISTRY[n.id];
          if (!def) return false;
          const assessment = assessNarrative(n.id, snapshot.signals);
          return assessment?.coverage !== "Insufficient Data";
        })
        .map((n: any) => {
          const def = NARRATIVE_REGISTRY[n.id];
          const assessment = assessNarrative(n.id, snapshot.signals);
          const coverage = assessment?.coverage ?? "Insufficient Data";
          const ratio = assessment?.coverageRatio ?? 0;

          return {
            id: def?.id || n.id,
            name: def?.name || n.name || "Unknown",
            coverage,
            coverageRatio: Math.round(ratio * 100) / 100,
            reasoning: n.reasoning || "",
            indicators: Array.isArray(n.indicators)
              ? n.indicators.map((ind: any) => ({
                  label: ind.label || "",
                  value: ind.value || "N/A",
                  signal: ["bullish", "bearish", "neutral"].includes(ind.signal)
                    ? ind.signal
                    : "neutral",
                  isLive: ind.isLive === true,
                }))
              : [],
          };
        })
    : [];

  // Insufficient data narratives for UI display
  const insufficientNarratives = insufficient.map((a) => ({
    id: a.id,
    name: a.name,
    missingSignals: a.missingSignals,
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
    market_context_used: snapshot.availableCount > 0 || marketCtx.headlines.length > 0,
    premise_corrected: intent.factCheckNote !== null,
    insufficient_data_narratives: insufficientNarratives,
  };
}
