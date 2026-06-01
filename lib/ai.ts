import OpenAI from "openai";
import {
  resolveNarrative,
  NARRATIVE_REGISTRY,
  getAvailableDataSources,
  formatActiveNarrativesForPrompt,
} from "@/lib/narratives";
import type { MarketContext } from "@/lib/market-data";
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
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ResearchNarrative {
  id: string;
  name: string;
  confidence: ConfidenceLevel;
  indicators: NarrativeIndicator[];
  reasoning: string;
}

export interface ResearchOutput {
  /** The user's inferred intent */
  intent: string;
  summary: string;
  narratives: ResearchNarrative[];
  evidence: string[];
  risks: string[];
  confidence: ConfidenceLevel;
  /** Description text explaining the overall confidence level */
  confidence_rationale: string;
  market_context_used: boolean;
  /** If true, the question's premise contradicts observable data */
  premise_corrected: boolean;
  /** List of narrative IDs suppressed due to insufficient data */
  suppressed_narratives: string[];
}

// ——— Prompt builder ———

function buildSystemPrompt(marketCtx: MarketContext, intent: IntentResult): string {
  const marketBlock = formatMarketContextForPrompt(marketCtx);

  // Determine which data sources are available
  const hasBtcPrice = marketCtx.snapshot?.btc?.price != null;
  const hasNews = marketCtx.headlines.length > 0;
  const availableSources = getAvailableDataSources(hasBtcPrice, hasNews);

  const { block: narrativeBlock, activeIds } =
    formatActiveNarrativesForPrompt(availableSources);

  return `You are a senior market analyst at a top-tier macro research firm. Your analysis is measured, evidence-grounded, and honest about uncertainty.

## USER INTENT
The user asked: "${intent.normalizedQuestion}"
Inferred intent: ${intent.intent}

${intent.factCheckNote || ""}

## YOUR TASK
Provide a market analysis addressing the user's actual intent. If the literal wording of the question contradicts the real-time data provided above, address this professionally and reframe the answer around what IS happening, without rejecting the user's question.

## AVAILABLE NARRATIVES (MATCH FROM THIS LIST ONLY)
You MUST select from these pre-defined narratives. Suppressed narratives are listed because we lack the data to support them credibly.
${narrativeBlock}

${marketBlock || "## WARNING: No real-time market data available. Use your best judgment but flag this limitation."}

## CONFIDENCE LEVELS
Use qualitative labels, not percentages:
- "High" — Multiple converging data points strongly support this narrative
- "Medium" — Evidence is directionally aligned but not conclusive
- "Low" — Plausible narrative but data is sparse, dated, or contradictory

## OUTPUT REQUIREMENTS
Return ONLY valid JSON with this EXACT structure:

{
  "summary": "3-4 sentence executive summary. Reference specific data. If the market data contradicts the user's premise, address this professionally in the first sentence.",
  "narratives": [
    {
      "id": "NARRATIVE_ID_FROM_REGISTRY",
      "confidence": "High",
      "reasoning": "1 sentence explaining WHY this confidence level, referencing specific data.",
      "indicators": [
        { "label": "BTC Price", "value": "$72,906", "signal": "bearish" },
        { "label": "ETF Flow Estimate", "value": "+$200M", "signal": "bullish" }
      ]
    }
  ],
  "evidence": ["Specific data point 1", "Specific data point 2"],
  "risks": ["What could invalidate this thesis 1", "What could invalidate this thesis 2"],
  "confidence": "Medium",
  "confidence_rationale": "1 sentence explaining overall confidence"
}

## RULES
1. Narratives MUST come from the AVAILABLE NARRATIVES list above. Match by id.
2. Each narrative MUST include 2-4 indicators with specific values (even if estimated).
3. If a narrative's required data is unavailable, its indicators should show "N/A" and signal "neutral". Confidence for such narratives MUST be "Low".
4. PRIORITIZE real-time market data over your training knowledge.
5. For a "High" confidence label, you MUST have ≥2 specific data points backing it.
6. Do NOT make up exact numbers. Use "estimates suggest", "reports indicate" when uncertain.
7. The overall "confidence" reflects how well-supported the ENTIRE analysis is, not a single narrative.`;
}

// ——— Confidence normalization ———

function normalizeConfidence(raw: string): ConfidenceLevel {
  const v = String(raw || "").toLowerCase().trim();
  if (v.includes("high")) return "High";
  if (v.includes("medium") || v.includes("moderate")) return "Medium";
  if (v.includes("low")) return "Low";
  return "Medium"; // safe default
}

function confidenceRationale(level: ConfidenceLevel): string {
  switch (level) {
    case "High":
      return "Multiple converging data points support this analysis with strong conviction.";
    case "Medium":
      return "Evidence is directionally aligned but incomplete — monitor for confirmation.";
    case "Low":
      return "Data is sparse or contradictory — this thesis has limited backing at present.";
  }
}

// ——— Main ———

export async function generateResearch(
  question: string,
  marketCtx: MarketContext,
  intent: IntentResult
): Promise<ResearchOutput> {
  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: buildSystemPrompt(marketCtx, intent) },
      { role: "user", content: intent.normalizedQuestion },
    ],
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from DeepSeek");

  const parsed = JSON.parse(raw);

  // Determine which source data was actually available
  const hasBtcPrice = marketCtx.snapshot?.btc?.price != null;
  const hasNews = marketCtx.headlines.length > 0;
  const availableSources = getAvailableDataSources(hasBtcPrice, hasNews);
  const { activeIds } = formatActiveNarrativesForPrompt(availableSources);

  // Detect suppressed narratives (ones in registry but not active)
  const suppressedIds: string[] = [];
  for (const id of Object.keys(NARRATIVE_REGISTRY)) {
    if (!activeIds.has(id)) {
      suppressedIds.push(id);
    }
  }

  // Validate narratives — resolve against registry, downgrade confidence for suppressed
  const validatedNarratives: ResearchNarrative[] = Array.isArray(parsed.narratives)
    ? parsed.narratives
        .filter((n: any) => {
          // Filter out narratives the LLM shouldn't have used
          const id = n.id || "";
          const def = resolveNarrative(id);
          // Only drop if it's not in the active list AND we have some data available
          if (def && !activeIds.has(def.id) && (hasBtcPrice || hasNews)) {
            return false;
          }
          return true;
        })
        .map((n: any) => {
          const def = resolveNarrative(n.id || "");
          // Downgrade confidence if narrative lacks data sources
          const isSuppressed = def ? !activeIds.has(def.id) : false;
          const confidence = isSuppressed ? "Low" : normalizeConfidence(n.confidence);

          return {
            id: def?.id || n.id || "UNKNOWN",
            name: def?.name || n.name || n.id || "Unknown",
            confidence,
            reasoning: isSuppressed
              ? `${n.reasoning || "Narrative identified but supporting data unavailable."} Note: real-time data for this narrative is currently unavailable — confidence downgraded to Low.`
              : n.reasoning || "",
            indicators: Array.isArray(n.indicators)
              ? n.indicators.map((ind: any) => ({
                  label: ind.label || "",
                  value: ind.value || "N/A",
                  signal: ["bullish", "bearish", "neutral"].includes(ind.signal)
                    ? ind.signal
                    : "neutral",
                }))
              : [],
          };
        })
    : [];

  const overallConfidence = normalizeConfidence(parsed.confidence);

  return {
    intent: intent.intent,
    summary: parsed.summary || "Analysis unavailable.",
    narratives: validatedNarratives,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    confidence: overallConfidence,
    confidence_rationale:
      parsed.confidence_rationale || confidenceRationale(overallConfidence),
    market_context_used: hasBtcPrice || hasNews,
    premise_corrected: intent.factCheckNote !== null,
    suppressed_narratives: suppressedIds,
  };
}
