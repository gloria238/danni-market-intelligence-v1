// Expectation Registry — what signal patterns predict.
//
// Layer 2.5 of the reasoning stack:
//   SIGNALS → DIVERGENCE ANALYSIS → NARRATIVES → MEMO
//
// Each expectation = a pair of signals with a predicted direction relationship.
// The divergence detector checks "expected vs actual" for every pair.
// This is pure computation — no LLM involved.

import type { SignalValue, SignalDirection } from "@/lib/signals";

/* ——— Expectation Definition ——— */

export type CorrelationType = "inverse" | "direct";

export interface SignalExpectation {
  id: string;
  signalA: string;
  signalB: string;
  /** Human-readable description of the expected relationship */
  description: string;
  /** inverse: A↓→B↑, A↑→B↓. direct: A↓→B↓, A↑→B↑ */
  correlation: CorrelationType;
  /** How strong is this relationship empirically */
  strength: "strong" | "moderate" | "tentative";
  /** What happens when the expectation is met */
  confirmedMeaning: string;
  /** What happens when the expectation is violated */
  divergenceMeaning: string;
  /** What missing signal could explain the divergence */
  resolutionSignal: string | null;
}

/* ——— All signal expectations ——— */

export const EXPECTATION_REGISTRY: SignalExpectation[] = [
  {
    id: "DXY_BTC",
    signalA: "DXY_INDEX",
    signalB: "BTC_PRICE",
    description: "When USD weakens, dollar-denominated risk assets typically rise",
    correlation: "inverse",
    strength: "strong",
    confirmedMeaning:
      "USD weakness is flowing through to Bitcoin as expected — risk appetite is broad-based.",
    divergenceMeaning:
      "Despite a weakening USD (typically bullish for BTC), Bitcoin is declining. This suggests crypto-specific selling pressure is overwhelming the macro tailwind — ETF outflows, position reduction, or regulatory concern.",
    resolutionSignal: "BTC_ETF_FLOW",
  },

  {
    id: "YIELD_BTC",
    signalA: "US10Y_YIELD",
    signalB: "BTC_PRICE",
    description: "Falling yields reduce the opportunity cost of holding non-yielding assets",
    correlation: "inverse",
    strength: "moderate",
    confirmedMeaning:
      "Declining Treasury yields are consistent with a risk appetite rotation toward Bitcoin and growth assets.",
    divergenceMeaning:
      "Treasury yields are falling (positive for risk assets) but Bitcoin is not participating. This pattern suggests a crypto-specific headwind that is more powerful than the macro tailwind.",
    resolutionSignal: "BTC_ETF_FLOW",
  },

  {
    id: "GOLD_DXY",
    signalA: "DXY_INDEX",
    signalB: "GOLD_PRICE",
    description: "A weaker dollar makes gold cheaper for non-USD buyers",
    correlation: "inverse",
    strength: "strong",
    confirmedMeaning:
      "DXY weakness is being confirmed by gold strength — classic dollar-weakness regime.",
    divergenceMeaning:
      "DXY declining without gold strength is unusual. This could indicate a temporary dollar move rather than a structural shift, or a risk-appetite extreme where capital rotates to equities rather than gold.",
    resolutionSignal: null,
  },

  {
    id: "ETF_BTC",
    signalA: "BTC_ETF_FLOW",
    signalB: "BTC_PRICE",
    description: "Sustained ETF inflows create spot buying pressure",
    correlation: "direct",
    strength: "moderate",
    confirmedMeaning:
      "ETF flows and BTC price are moving in the same direction — flow-driven price action.",
    divergenceMeaning:
      "ETF flows and BTC price are moving in opposite directions. If flows are positive but BTC is declining, selling is coming from elsewhere (OTC desks, spot exchanges, futures). If flows are negative but BTC is rising, leveraged or spot buying is overcoming the flow headwind.",
    resolutionSignal: null,
  },

  {
    id: "YIELDS_DXY",
    signalA: "US10Y_YIELD",
    signalB: "DXY_INDEX",
    description: "Falling yields reduce dollar demand from yield-seeking capital flows",
    correlation: "direct",
    strength: "moderate",
    confirmedMeaning:
      "Yields and DXY moving together — consistent macro picture. Both declining = easing conditions.",
    divergenceMeaning:
      "Yields and DXY moving in opposite directions suggests a transitional macro phase or external factors (geopolitical flows, carry trade unwinds). The signal is less clean — wait for convergence.",
    resolutionSignal: null,
  },

  {
    id: "GOLD_BTC",
    signalA: "GOLD_PRICE",
    signalB: "BTC_PRICE",
    description: "Gold and Bitcoin sometimes correlate as hard/decentralized assets",
    correlation: "direct",
    strength: "tentative",
    confirmedMeaning:
      "Gold and Bitcoin rising together — consistent with either dollar weakness or safe-haven demand.",
    divergenceMeaning:
      "Gold and Bitcoin diverging. If gold is rising while BTC falls, Bitcoin is not participating in whatever is driving gold (likely dollar weakness or geopolitical concern). This is a BTC-specific issue, not a macro one.",
    resolutionSignal: "MARKET_NEWS",
  },

  {
    id: "CURVE_STEEPENING",
    signalA: "US2Y_YIELD",
    signalB: "US10Y_YIELD",
    description: "Short-end yields falling faster than long-end = market pricing rate cuts",
    correlation: "inverse",
    strength: "strong",
    confirmedMeaning:
      "Curve steepening via front-end rally — bond market is pricing imminent Fed cuts. This is the most dovish yield curve signal.",
    divergenceMeaning:
      "Curve behavior is not showing a clean steepening/flattening signal. The rates market may be repricing due to data or Fed communication rather than a clear directional move.",
    resolutionSignal: null,
  },
];

/* ——— Divergence Types ——— */

export type DivergenceType = "confirmed" | "divergence";

export interface DivergenceObservation {
  id: string;
  type: DivergenceType;
  severity: "notable" | "moderate" | "minor";
  signalA: { label: string; value: string; direction: SignalDirection | null };
  signalB: { label: string; value: string; direction: SignalDirection | null };
  expectation: SignalExpectation;
  interpretation: string;
}

export interface CrossSignalAnalysis {
  overall: "supportive" | "divergent" | "mixed" | "insufficient_data";
  summary: string;
  confirmedPatterns: DivergenceObservation[];
  divergences: DivergenceObservation[];
  /** Ratio of confirmed pairs to total testable pairs */
  confirmationRatio: number;
  totalTestable: number;
}

/* ——— Divergence Detector ——— */

export function detectDivergences(
  signals: Record<string, SignalValue>
): CrossSignalAnalysis {
  const confirmed: DivergenceObservation[] = [];
  const divergences: DivergenceObservation[] = [];

  for (const exp of EXPECTATION_REGISTRY) {
    const sA = signals[exp.signalA];
    const sB = signals[exp.signalB];

    // Both signals must be available + have direction to test
    if (!sA?.available || !sA.direction || !sB?.available || !sB.direction) {
      continue;
    }

    // Both must have meaningful direction (not "stable")
    if (sA.direction === "stable" && sB.direction === "stable") {
      continue;
    }

    // Determine if expectation is confirmed or diverged
    const type = evaluateExpectation(exp, sA.direction, sB.direction);
    const interpretation =
      type === "confirmed" ? exp.confirmedMeaning : exp.divergenceMeaning;

    // Severity: notable if strong correlation + divergence, minor if tentative
    const severity: DivergenceObservation["severity"] =
      type === "divergence"
        ? exp.strength === "strong"
          ? "notable"
          : exp.strength === "moderate"
            ? "moderate"
            : "minor"
        : "minor";

    const observation: DivergenceObservation = {
      id: exp.id,
      type,
      severity,
      signalA: {
        label: sA.label,
        value: sA.value,
        direction: sA.direction,
      },
      signalB: {
        label: sB.label,
        value: sB.value,
        direction: sB.direction,
      },
      expectation: exp,
      interpretation,
    };

    if (type === "confirmed") confirmed.push(observation);
    else divergences.push(observation);
  }

  const totalTestable = confirmed.length + divergences.length;
  const confirmationRatio = totalTestable > 0 ? confirmed.length / totalTestable : 0;

  // Overall assessment
  let overall: CrossSignalAnalysis["overall"] = "insufficient_data";
  if (totalTestable > 0) {
    if (divergences.length === 0) overall = "supportive";
    else if (confirmed.length > divergences.length) overall = "mixed";
    else overall = "divergent";
  }

  return {
    overall,
    summary: synthesizeSummary(overall, confirmed, divergences),
    confirmedPatterns: confirmed,
    divergences,
    confirmationRatio: Math.round(confirmationRatio * 100) / 100,
    totalTestable,
  };
}

function evaluateExpectation(
  exp: SignalExpectation,
  dirA: SignalDirection,
  dirB: SignalDirection
): DivergenceType {
  // Stable signals don't create divergence/confirmation
  if (dirA === "stable" || dirB === "stable") return "confirmed";

  const aIsRising = dirA === "rising";
  const bIsRising = dirB === "rising";

  if (exp.correlation === "inverse") {
    // A ↑ → B ↓, A ↓ → B ↑
    return aIsRising !== bIsRising ? "confirmed" : "divergence";
  } else {
    // A ↑ → B ↑, A ↓ → B ↓
    return aIsRising === bIsRising ? "confirmed" : "divergence";
  }
}

function synthesizeSummary(
  overall: CrossSignalAnalysis["overall"],
  confirmed: DivergenceObservation[],
  divergences: DivergenceObservation[]
): string {
  if (overall === "insufficient_data") {
    return "Not enough directional signal pairs to assess cross-market alignment. At least two signals with clear direction are required.";
  }

  // Build macro signal assessment
  const macroConfirmed = confirmed.filter(
    (c) =>
      c.expectation.id === "DXY_BTC" ||
      c.expectation.id === "YIELD_BTC" ||
      c.expectation.id === "CURVE_STEEPENING" ||
      c.expectation.id === "YIELDS_DXY"
  );

  // Build divergence story
  const notableDivergences = divergences.filter(
    (d) => d.severity === "notable"
  );
  const moderateDivergences = divergences.filter(
    (d) => d.severity === "moderate"
  );

  const confirmedPct =
    divergences.length + confirmed.length > 0
      ? Math.round(
          (confirmed.length / (confirmed.length + divergences.length)) * 100
        )
      : 0;

  if (overall === "supportive") {
    return `Signals are well-aligned (${confirmedPct}% confirmation). All testable signal pairs show the expected relationships — the macro picture is internally consistent.`;
  }

  if (overall === "divergent") {
    const parts: string[] = [];
    parts.push(
      `Significant divergence detected — ${divergences.length} of ${divergences.length + confirmed.length} testable pairs violate expected relationships (${confirmedPct}% confirmation). `
    );

    if (notableDivergences.length > 0) {
      const div = notableDivergences[0];
      parts.push(
        `Key anomaly: ${div.signalA.label} ${div.signalA.direction === "rising" ? "↑" : "↓"} but ${div.signalB.label} is moving ${div.signalB.direction === "rising" ? "↑" : "↓"} — the opposite of what ${div.expectation.description.toLowerCase()}. `
      );
      if (div.expectation.resolutionSignal) {
        parts.push(
          `${div.expectation.resolutionSignal} data would help resolve this.`
        );
      }
    }

    return parts.join("");
  }

  // Mixed
  const parts: string[] = [];
  parts.push(
    `Mixed signal picture (${confirmed.length} confirmations, ${divergences.length} divergences). `
  );

  if (macroConfirmed.length >= 2 && notableDivergences.length >= 1) {
    parts.push(
      "Macro signals are directionally supportive but are being contradicted by price action — suggesting a crypto-specific factor is dominant. "
    );
  } else if (divergences.length > confirmed.length) {
    parts.push(
      "Divergences outnumber confirmations — the market is in a transitional or noisy phase. Directional conviction is low. "
    );
  } else {
    parts.push(
      "More signals confirming than diverging, but the divergences warrant monitoring. "
    );
  }

  if (notableDivergences.length > 0) {
    const missingSignals = notableDivergences
      .map((d) => d.expectation.resolutionSignal)
      .filter((s): s is string => s !== null);
    if (missingSignals.length > 0) {
      const unique = [...new Set(missingSignals)];
      parts.push(
        `Missing data to resolve the picture: ${unique.join(", ")}.`
      );
    }
  }

  return parts.join("");
}

/* ——— Prompt formatting ——— */

export function formatCrossSignalForPrompt(
  analysis: CrossSignalAnalysis
): string {
  if (analysis.totalTestable === 0) {
    return "## CROSS-SIGNAL ANALYSIS\n\nNot enough directional signal pairs available to assess cross-market alignment.\n";
  }

  let block = `## CROSS-SIGNAL ANALYSIS (${analysis.overall.toUpperCase()})\n\n`;

  block += `### Summary\n${analysis.summary}\n\n`;

  if (analysis.confirmedPatterns.length > 0) {
    block += "### Confirmed Relationships\n";
    for (const c of analysis.confirmedPatterns) {
      const aDir = c.signalA.direction === "rising" ? "↑" : "↓";
      const bDir = c.signalB.direction === "rising" ? "↑" : "↓";
      block += `- ✓ ${c.signalA.label} ${aDir} + ${c.signalB.label} ${bDir} → ${c.expectation.description.toLowerCase()}\n`;
    }
    block += "\n";
  }

  if (analysis.divergences.length > 0) {
    block += "### ⚠️ Divergences (Expectation vs Observation)\n";
    for (const d of analysis.divergences) {
      const sev =
        d.severity === "notable"
          ? "NOTABLE"
          : d.severity === "moderate"
            ? "MODERATE"
            : "minor";
      const aDir = d.signalA.direction === "rising" ? "↑" : "↓";
      const bDir = d.signalB.direction === "rising" ? "↑" : "↓";
      block += `- [${sev}] ${d.expectation.description}: expected ${d.signalB.label} to move ${d.expectation.correlation === "inverse" ? "opposite" : "with"} ${d.signalA.label}, but ${d.signalA.label} ${aDir} (${d.signalA.value}) + ${d.signalB.label} ${bDir} (${d.signalB.value})\n`;
      block += `  Interpretation: ${d.interpretation}\n`;
      if (d.expectation.resolutionSignal) {
        block += `  Resolution signal: ${d.expectation.resolutionSignal}\n`;
      }
    }
    block += "\n";
  }

  block += `### Instructions
When writing the summary, LEAD with the most interesting finding — which may be a divergence, not a narrative confirmation. A divergence is as informative as a confirmation.

Example of a good summary:
"Bitcoin is showing an interesting divergence: macro conditions are increasingly supportive (DXY ↓, US10Y ↓) but BTC is declining — suggesting crypto-specific selling is overwhelming the macro tailwind."

Example of a bad summary:
"No narratives are strongly supported."

Find the story in the data, not the absence of one.\n`;

  return block;
}
