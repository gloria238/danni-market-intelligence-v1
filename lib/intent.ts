// Query Intent Layer — NOT AI.
// Simple rule-based normalization.
//
// Users say "Why is BTC rising?" — but BTC might be down.
// The system infers intent ("analyze BTC market"), not literal question semantics.

export type Intent = "market_analysis" | "causal_inquiry" | "scenario_analysis" | "risk_check";

export interface IntentResult {
  intent: Intent;
  normalizedQuestion: string;
  /** If the literal premise of the question contradicts facts, this note is injected into the prompt */
  factCheckNote: string | null;
}

const ASSETS: Record<string, string> = {
  bitcoin: "BTC",
  btc: "BTC",
  ethereum: "ETH",
  eth: "ETH",
  solana: "SOL",
  sol: "SOL",
  gold: "gold",
  "s&p": "S&P 500",
  "s&p 500": "S&P 500",
  spx: "S&P 500",
  nasdaq: "NASDAQ",
  dollar: "USD",
  usd: "USD",
  dxy: "DXY",
  oil: "crude oil",
};

const DIRECTION_UP = /\b(rising|up|rally|pump|pumping|moon|mooning|bull|bullish|surge|surging|soar|soaring|green|green dildo)\b/i;
const DIRECTION_DOWN = /\b(falling|down|crash|crashing|dump|dumping|bear|bearish|plunge|plunging|drop|dropping|sell(-)?off|tank|tanking|red)\b/i;
const WHY_PATTERN = /\b(why|what('s| is) driving|what('s| is) causing|what('s| is) behind|reason|explain)\b/i;
const SCENARIO_PATTERN = /\b(what if|how would|if.*(cut|hike|raise|lower|ease|tighten|print|announce)|scenario|imagine|suppose)\b/i;
const RISK_PATTERN = /\b(risk|worst case|bear case|what could go wrong|downside|danger|vulnerability|threat)\b/i;

export function detectIntent(
  question: string
): IntentResult {
  const q = question.trim();
  const qLower = q.toLowerCase();

  // Detect scenario analysis
  if (SCENARIO_PATTERN.test(qLower)) {
    return {
      intent: "scenario_analysis",
      normalizedQuestion: q,
      factCheckNote: null,
    };
  }

  // Detect risk check
  if (RISK_PATTERN.test(qLower)) {
    return {
      intent: "risk_check",
      normalizedQuestion: q,
      factCheckNote: null,
    };
  }

  // Detect causal inquiry (why + asset + direction)
  if (WHY_PATTERN.test(qLower)) {
    // Find which asset
    let asset = "";

    for (const [key, value] of Object.entries(ASSETS)) {
      if (qLower.includes(key)) {
        asset = value;
        break;
      }
    }

    // Detect direction claim
    const dirUp = DIRECTION_UP.test(qLower);
    const dirDown = DIRECTION_DOWN.test(qLower);

    if (asset && (dirUp || dirDown)) {
      const claimedDir = dirUp ? "rising" : "falling";

      // Always rewrite as market analysis — not literal fact-check
      return {
        intent: "market_analysis",
        normalizedQuestion: `Provide a comprehensive market analysis for ${asset}. What narratives are currently influencing ${asset}? What evidence supports each narrative? What are the key risks? ${q}`,
        factCheckNote: `NOTE: The user's question assumes ${asset} is ${claimedDir}. Analyze ${asset} based on the actual market data provided above. If the data contradicts the user's premise, address the discrepancy professionally: "While the framing of the question suggests ${asset} is ${claimedDir}, the latest data shows... However, the key narratives influencing ${asset} right now are..." Never reject the user's question — reinterpret it as a request for market analysis.`,
      };
    }

    // "Why" question without specific direction claim — still market analysis
    if (asset) {
      return {
        intent: "market_analysis",
        normalizedQuestion: `Provide a comprehensive market analysis for ${asset}: ${q}`,
        factCheckNote: null,
      };
    }
  }

  // Default: treat as market analysis
  return {
    intent: "market_analysis",
    normalizedQuestion: q,
    factCheckNote: null,
  };
}
