"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles, Loader2, LogOut, ArrowUp, BarChart3,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnomalyCard, type AnomalyCardData } from "@/components/scanner/anomaly-card";
import { severityLabel, severityColor } from "@/lib/ranking";
import type { ResearchOutput } from "@/lib/ai";
import { useLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

interface ScannerState {
  loading: boolean;
  data: ResearchOutput | null;
  error: string | null;
}

export default function DivergenceScannerPage() {
  const [state, setState] = useState<ScannerState>({ loading: true, data: null, error: null });
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const { t } = useLocale();

  // Auth check
  useEffect(() => {
    const c = createClient();
    c.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/login?redirect=/divergences");
      else setAuthChecked(true);
    });
  }, [router]);

  // Auto-scan on load
  const scan = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What are today's most notable market anomalies and divergences?" }),
      });
      if (!res.ok) throw new Error("Scan failed");
      const data: ResearchOutput = await res.json();
      setState({ loading: false, data, error: null });
    } catch (err: any) {
      setState({ loading: false, data: null, error: err.message || "Scan failed" });
    }
  }, []);

  useEffect(() => {
    if (authChecked) scan();
  }, [authChecked, scan]);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted"/></div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle border border-accent/20">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <span className="font-semibold text-sm tracking-tight">{t("nav.market_intelligence")}</span>
        </div>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <a href="/timeline" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("nav.timeline")}</a>
          <a href="/patterns" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("nav.library")}</a>
          <a href="/research" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("nav.research_chat")}</a>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-surface">
            <LogOut className="h-3 w-3" />{t("nav.sign_out")}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("scanner.title")}</h1>
              <p className="text-sm text-foreground-secondary mt-1">{t("scanner.subtitle")}</p>
            </div>
            <button
              onClick={scan}
              disabled={state.loading}
              className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-white px-4 py-2.5 text-sm font-semibold shadow-lg shadow-accent/20 transition-all disabled:opacity-40"
            >
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowUp className="h-4 w-4"/>}
              {state.loading ? t("scanner.scanning_btn") : t("scanner.rescan")}
            </button>
          </div>

          {/* Loading */}
          {state.loading && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
              <p className="text-sm text-foreground-secondary">{t("scanner.scanning")}</p>
              <p className="text-xs text-muted mt-1">{t("scanner.fetching")}</p>
            </div>
          )}

          {/* Error */}
          {state.error && (
            <div className="rounded-xl border border-danger/20 bg-danger-subtle/20 p-6 text-center">
              <AlertTriangle className="h-6 w-6 text-danger mx-auto mb-2" />
              <p className="text-sm text-danger">{state.error}</p>
              <button onClick={scan} className="mt-3 text-xs text-accent hover:underline">{t("scanner.retry")}</button>
            </div>
          )}

          {/* Results */}
          {state.data && !state.loading && (
            <>
              {/* Signal coverage */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000", state.data.signal_coverage.available / state.data.signal_coverage.total >= 0.6 ? "bg-success" : "bg-warning")}
                    style={{ width: `${(state.data.signal_coverage.available / state.data.signal_coverage.total) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-muted">{state.data.signal_coverage.available}/{state.data.signal_coverage.total} {t("scanner.signals")}</span>
                {state.data.attribution && state.data.attribution.unexplainedRatio > 0.8 && (
                  <span className="text-[10px] text-danger bg-danger-subtle rounded-full px-2 py-0.5 font-semibold border border-danger/20">{t("scanner.high_unexplained")}</span>
                )}
              </div>

              {/* V4: Research Health */}
              {state.data.researchHealth && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-surface-elevated border border-border px-3 py-2 text-center">
                    <div className="text-sm font-mono font-bold text-foreground">{state.data.researchHealth.coverage.pct}%</div>
                    <div className="text-[10px] text-muted">{t("health.coverage")}</div>
                  </div>
                  <div className="rounded-lg bg-surface-elevated border border-border px-3 py-2 text-center">
                    <div className="text-sm font-mono font-bold text-foreground">{state.data.researchHealth.freshness.pct}%</div>
                    <div className="text-[10px] text-muted">{t("health.freshness")}</div>
                  </div>
                  <div className="rounded-lg bg-surface-elevated border border-border px-3 py-2 text-center">
                    <div className="text-sm font-mono font-bold text-foreground">{state.data.researchHealth.sourceHealth.pct}%</div>
                    <div className="text-[10px] text-muted">{t("health.source_health")}</div>
                  </div>
                </div>
              )}

              {/* Attribution summary */}
              {state.data.attribution && state.data.attribution.btcActualMove !== 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-5 py-3 text-xs">
                  <BarChart3 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary">{state.data.attributionText}</span>
                </div>
              )}

              {/* Ranked anomalies */}
              {state.data.cross_signals?.rankedDivergences && state.data.cross_signals.rankedDivergences.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-warning">{t("scanner.divergences")}</h2>
                    <span className="text-xs text-muted">— {t("scanner.ranked_by")}</span>
                  </div>
                  <div className="grid gap-3">
                    {state.data.cross_signals.rankedDivergences.map((d) => {
                      const histMatch = state.data?.historicalPatterns?.[d.id];
                      const evidenceData = state.data?.v5Evidence;
                      return (
                        <AnomalyCard
                          key={d.id}
                          data={{
                            id: d.id,
                            signalA: d.signalA,
                            signalB: d.signalB,
                            description: d.expectation.description,
                            interpretation: d.interpretation,
                            severityScore: d.severityScore,
                            type: "divergence",
                            resolutionSignal: d.expectation.resolutionSignal,
                            unexplainedMove: state.data!.attribution?.unexplained,
                            historicalMatch: histMatch,
                            evidenceLabel: evidenceData?.topExplanation?.label,
                            evidenceStrength: evidenceData?.topExplanation?.strength,
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Confirmed relationships */}
              {state.data.cross_signals?.confirmedPatterns && state.data.cross_signals.confirmedPatterns.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-success">{t("scanner.confirmed")}</h2>
                  </div>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {state.data.cross_signals.confirmedPatterns.map((c) => {
                      const aA = c.signalA.direction === "rising" ? "↑" : c.signalA.direction === "falling" ? "↓" : "→";
                      const bA = c.signalB.direction === "rising" ? "↑" : c.signalB.direction === "falling" ? "↓" : "→";
                      return (
                        <div key={c.id} className="flex items-center gap-2 text-xs rounded-lg bg-surface-elevated border border-border px-3.5 py-2.5">
                          <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                          <span className="text-foreground-secondary">{c.signalA.label} <span className="font-mono text-foreground">{aA}</span> + {c.signalB.label} <span className="font-mono text-foreground">{bA}</span></span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Not Assessable */}
              {state.data.not_assessable.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">{t("scanner.not_assessable")} ({state.data.not_assessable.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {state.data.not_assessable.map((n) => (
                      <span key={n.id} className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-border px-3 py-1.5 text-[11px] text-muted">
                        <span className="font-medium text-foreground-secondary">{n.name}</span>
                        {t("scanner.missing")}: {n.missingSignals.join(", ")}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
