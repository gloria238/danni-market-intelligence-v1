import OpenAI from "openai";
import {
  formatNarrativeRegistryForPrompt,
  resolveNarrative,
} from "@/lib/narratives";
import type { MarketContext } from "@/lib/market-data";
import { formatMarketContextForPrompt } from "@/lib/market-data";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export interface NarrativeIndicator {
  label: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
}

export interface ResearchNarrative {
  id: string;
  name: string;
  confidence: number;
  indicators: NarrativeIndicator[];
  reasoning: string;
}

export interface ResearchOutput {
  summary: string;
  narratives: ResearchNarrative[];
  evidence: string[];
  risks: string[];
  confidence_score: number;
  market_context_used: boolean;
}

function buildSystemPrompt(marketCtx: MarketContext): string {
  const marketBlock = formatMarketContextForPrompt(marketCtx);
  const narrativeBlock = formatNarrativeRegistryForPrompt();

  return `You are a senior market analyst at a top-tier macro research firm.

## YOUR TASK
Analyze the user's market question using the provided real-time market data and the narrative framework below.

## AVAILABLE NARRATIVES (MATCH FROM THIS LIST ONLY)
You MUST select from these pre-defined narratives. Do NOT invent new narratives.
${narrativeBlock}

${marketBlock || "## WARNING: No real-time market data available. Use your best judgment but flag this limitation."}

## OUTPUT REQUIREMENTS
Return ONLY valid JSON with this EXACT structure:

{
  "summary": "3-4 sentence executive summary. Reference specific numbers from the market data above.",
  "narratives": [
    {
      "id": "NARRATIVE_ID_FROM_REGISTRY",
      "confidence": 85,
      "reasoning": "1 sentence explaining WHY this confidence level, referencing specific data.",
      "indicators": [
        { "label": "BTC ETF Flow", "value": "+$200M", "signal": "bullish" },
        { "label": "DXY", "value": "-0.8%", "signal": "bullish" }
      ]
    }
  ],
  "evidence": ["Specific data point 1 from the market context", "Specific data point 2"],
  "risks": ["What could invalidate this thesis 1", "What could invalidate this thesis 2"],
  "confidence_score": 75
}

## RULES
1. Narratives MUST come from the AVAILABLE NARRATIVES list above. Match by id.
2. Each narrative MUST include 2-4 indicators with values pulled from the market data.
3. Confidence scores should reflect REAL uncertainty. Never 100%. If data is sparse, confidence should be lower.
4. Evidence items MUST reference specific numbers/dates/sources from the provided data.
5. If market data is available, PRIORITIZE it over your training data.
6. Do NOT make up numbers. If you're uncertain, say so in the reasoning field.`;
}

export async function generateResearch(
  question: string,
  marketCtx: MarketContext
): Promise<ResearchOutput> {
  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: buildSystemPrompt(marketCtx) },
      { role: "user", content: question },
    ],
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from DeepSeek");

  const parsed = JSON.parse(raw);

  // Validate narratives — resolve against registry
  const validatedNarratives: ResearchNarrative[] = Array.isArray(
    parsed.narratives
  )
    ? parsed.narratives.map((n: any) => {
        const def = resolveNarrative(n.id || "");
        return {
          id: def?.id || n.id || "UNKNOWN",
          name: def?.name || n.name || n.id || "Unknown",
          confidence: Math.min(100, Math.max(0, Number(n.confidence) || 50)),
          reasoning: n.reasoning || "",
          indicators: Array.isArray(n.indicators)
            ? n.indicators.map((ind: any) => ({
                label: ind.label || "",
                value: ind.value || "",
                signal: ["bullish", "bearish", "neutral"].includes(ind.signal)
                  ? ind.signal
                  : "neutral",
              }))
            : [],
        };
      })
    : [];

  return {
    summary: parsed.summary || "Analysis unavailable.",
    narratives: validatedNarratives,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    confidence_score: Math.min(
      100,
      Math.max(0, Number(parsed.confidence_score) || 50)
    ),
    market_context_used:
      marketCtx.snapshot !== null || marketCtx.headlines.length > 0,
  };
}
