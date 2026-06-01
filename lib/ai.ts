import OpenAI from "openai";
import {
  NARRATIVE_REGISTRY,
  assessNarrative,
  buildNarrativeCoverageTable,
  formatNarrativesForPrompt,
  type NarrativeAssessment,
} from "@/lib/narratives";
import type { SignalValue, SignalDirection } from "@/lib/signals";
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
  /** Signal pattern that supports/contradicts this narrative */
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
}

// ——— Prompt builder ———

function buildSystemPrompt(
  snapshot: MarketSnapshot,
  headlines: { title: string; source: string; url?: string; publishedAt?: string }[],
  intent: IntentResult
): string {
  const marketBlock = formatMarketContextForPrompt(snapshot, headlines as any);
  const narrativeBlock = formatNarrativesForPrompt(snapshot.signals);

  return `You are a senior market analyst. Your analysis is data-grounded — never speculative.

## USER INTENT
Intent: ${intent.intent}
Question: "${intent.normalizedQuestion}"
${intent.factCheckNote || ""}

## NARRATIVE FRAMEWORK
${narrativeBlock}

${marketBlock}

## OUTPUT — Return ONLY valid JSON

{
  "summary": "3-4 sentence summary. Reference specific data values. If the premise is wrong, address it first, then provide the analysis the user actually needs.",
  "narratives": [
    {
      "id": "NARRATIVE_ID",
      "reasoning": "1-2 sentences EXPLICITLY referencing specific data values from the Available signals above.",
      "directional_assessment": "1 sentence interpreting the signal direction pattern: e.g. 'DXY ↓ from 119.37 to 119.29 + Gold ↑ → USD weakness signal strengthening'",
      "indicators": [
        { "label": "DXY", "value": "119.29", "signal": "bearish", "isLive": true, "direction": "falling" },
        { "label": "Gold (XAUT)", "value": "$3,124", "signal": "bullish", "isLive": true, "direction": "rising" }
      ]
    }
  ],
  "evidence": ["Data point 1 from Available signals", "Data point 2 from Available signals"],
  "risks": ["What could invalidate the primary narrative", "Key uncertainty"]
}

## STRICT RULES
1. ONLY use narratives from the "ASSESSABLE" section above. NEVER reference "NOT ASSESSABLE" narratives.
2. Each indicator MUST come from that narrative's available signals. Check the signal list above each narrative.
3. indicator "value" must match the actual data value shown in Available signals. Do not invent or approximate.
4. Set "isLive": true ONLY if the value came from Available signals. Set false if you're estimating.
5. "signal" must be "bullish", "bearish", or "neutral" based on the data direction.
6. "direction" must be "rising", "falling", or "stable" from the data.
7. Evidence items must reference specific signal values.
8. If a narrative's directional logic contradicts the current data, say so in reasoning.
9. If only 1-2 narratives are assessable and data is sparse, acknowledge this in the summary.
10. Do NOT use BTC price as evidence for institutional buying. Use ETF flow. Each signal belongs to its narrative.`;
}

// ——— Main ———

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

  // Populate MARKET_NEWS signal if headlines exist
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

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(snapshot, marketCtx.headlines, intent),
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

  // Build coverage table
  const { assessable, notAssessable } = buildNarrativeCoverageTable(
    snapshot.signals
  );
  const assessableIds = new Set(assessable.map((a) => a.id));

  // Validate — ONLY keep narratives that are assessable
  const validatedNarratives: ResearchNarrative[] = Array.isArray(
    parsed.narratives
  )
    ? parsed.narratives
        .filter((n: any) => {
          const id = n.id || "";
          // Hard gate: narrative MUST be in assessable list
          if (!assessableIds.has(id)) return false;
          return true;
        })
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
                  // Filter to ONLY indicators from this narrative's signal set
                  .filter((ind: any) => {
                    if (!def) return true; // can't validate, keep
                    const allSignals = [
                      ...def.requiredSignals,
                      ...def.enhancingSignals,
                    ];
                    // Match by label or common patterns
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

  // Not-assessable for UI display
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
  };
}
