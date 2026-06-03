// Research Health — data quality assessment.
//
// Layer 5 of the reasoning stack:
//   ... → PATTERN MATCHING → RESEARCH HEALTH → EVIDENCE → ...
//
// Three independent dimensions — no composite score, no traffic light.
// The user sees the numbers and judges for themselves.

import type { SignalValue } from "@/lib/signals";

export interface ResearchHealth {
  coverage: {
    available: number;
    total: number;
    pct: number;
    missing: string[];
  };
  freshness: {
    freshSignals: number;
    staleSignals: number;
    pct: number;
    details: Array<{ signalId: string; label: string; hoursStale: number }>;
  };
  sourceHealth: {
    ok: number;
    failed: number;
    pct: number;
    failures: Array<{ source: string; error: string }>;
  };
}

export function assessResearchHealth(
  signals: Record<string, SignalValue>,
  sourceStatuses: Array<{ source: string; ok: boolean; error?: string }> = []
): ResearchHealth {
  const allIds = Object.keys(signals);
  const available = allIds.filter((id) => signals[id]?.available);
  const missing = allIds.filter((id) => !signals[id]?.available);

  // Freshness: signals from market data are always "just fetched" (< 1h)
  // In V3, all available signals are fresh since we just fetched them
  const freshSignals = available.length;
  const staleSignals = missing.length;

  // Source health from fetch results
  const ok = sourceStatuses.filter((s) => s.ok).length;
  const failed = sourceStatuses.filter((s) => !s.ok).length;
  const failures = sourceStatuses
    .filter((s) => !s.ok)
    .map((s) => ({ source: s.source, error: s.error || "Unknown error" }));

  return {
    coverage: {
      available: available.length,
      total: allIds.length,
      pct: allIds.length > 0 ? Math.round((available.length / allIds.length) * 100) : 0,
      missing: missing.map((id) => signals[id]?.label ?? id),
    },
    freshness: {
      freshSignals,
      staleSignals,
      pct: allIds.length > 0 ? Math.round((freshSignals / allIds.length) * 100) : 0,
      details: missing.map((id) => ({
        signalId: id,
        label: signals[id]?.label ?? id,
        hoursStale: 24, // unavailable signals treated as stale
      })),
    },
    sourceHealth: {
      ok,
      failed,
      pct: (ok + failed) > 0 ? Math.round((ok / (ok + failed)) * 100) : 0,
      failures,
    },
  };
}

export function formatHealthForPrompt(health: ResearchHealth | null): string {
  if (!health) {
    return "## RESEARCH HEALTH\n\nHealth assessment not available.\n";
  }

  let block = "## RESEARCH HEALTH\n\n";

  block += `Coverage: ${health.coverage.available}/${health.coverage.total} signals (${health.coverage.pct}%)\n`;
  if (health.coverage.missing.length > 0) {
    block += `Missing: ${health.coverage.missing.join(", ")}\n`;
  }

  block += `Freshness: ${health.freshness.freshSignals}/${health.coverage.total} fresh (${health.freshness.pct}%)\n`;

  block += `Source Health: ${health.sourceHealth.ok}/${health.sourceHealth.ok + health.sourceHealth.failed} sources OK (${health.sourceHealth.pct}%)\n`;
  if (health.sourceHealth.failures.length > 0) {
    block += `Source issues: ${health.sourceHealth.failures.map((f) => f.source).join(", ")}\n`;
  }

  block += `\n### Instructions
If coverage < 70% or freshness < 50%, note the data limitations in the summary.\n`;

  return block;
}
