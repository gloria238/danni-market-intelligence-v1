"use client";

import type { ResearchOutput } from "@/lib/ai";
import type { SignalDirection } from "@/lib/signals";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, Database, Activity, Target,
  ShieldAlert, Lightbulb, Layers, AlertTriangle, Wifi, WifiOff,
  CheckCircle2, XCircle, ArrowRight, GitCompare, BarChart3,
} from "lucide-react";
import { severityLabel, severityColor } from "@/lib/ranking";

/* ——— Sub-components ——— */

function DirectionTag({ direction }: { direction: SignalDirection | null }) {
  if (!direction) return null;
  if (direction === "rising") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-success bg-success-subtle/60 rounded px-1.5 py-0.5 border border-success/20">
        <TrendingUp className="h-2.5 w-2.5" />
        UP
      </span>
    );
  }
  if (direction === "falling") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-danger bg-danger-subtle/60 rounded px-1.5 py-0.5 border border-danger/20">
        <TrendingDown className="h-2.5 w-2.5" />
        DOWN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-muted bg-surface rounded px-1.5 py-0.5 border border-border">
      <Minus className="h-2.5 w-2.5" />
      FLAT
    </span>
  );
}

function SignalIcon({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  if (signal === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />;
  if (signal === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-danger shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-muted shrink-0" />;
}

function LiveTag({ isLive }: { isLive: boolean }) {
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-success bg-success-subtle rounded px-1 py-0 font-mono font-semibold uppercase border border-success/20">
        <Wifi className="h-2.5 w-2.5" /> Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-muted bg-surface rounded px-1 py-0 font-mono uppercase border border-border">
      Est
    </span>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-accent" />
      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</h4>
    </div>
  );
}

/* ——— Main Renderer ——— */

export function MemoRenderer({ data }: { data: ResearchOutput }) {
  if (!data) return null;

  const coveragePct =
    data.signal_coverage.total > 0
      ? Math.round((data.signal_coverage.available / data.signal_coverage.total) * 100)
      : 0;

  const assessableCount = data.narratives.length;
  const totalCount = assessableCount + data.not_assessable.length;

  return (
    <div className="glass-card p-6 space-y-7 animate-in">
      {/* === Header === */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Research Memo</h3>
          </div>
          <div className="flex items-center gap-2">
            {data.premise_corrected && (
              <span className="inline-flex items-center gap-1 text-[11px] text-warning bg-warning-subtle rounded-full px-2.5 py-0.5 font-medium border border-warning/20">
                <AlertTriangle className="h-3 w-3" /> Premise adjusted
              </span>
            )}
            {data.market_context_used ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-success bg-success-subtle rounded-full px-2.5 py-0.5 font-medium border border-success/20">
                <Database className="h-3 w-3" /> Live data
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-warning bg-warning-subtle rounded-full px-2.5 py-0.5 font-medium border border-warning/20">
                <WifiOff className="h-3 w-3" /> No data
              </span>
            )}
          </div>
        </div>

        {/* Signal coverage bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                coveragePct >= 70 ? "bg-success" : coveragePct >= 40 ? "bg-warning" : "bg-danger"
              )}
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-muted tabular-nums whitespace-nowrap">
            {data.signal_coverage.available}/{data.signal_coverage.total} signals
          </span>
        </div>

        <p className="text-[15px] font-medium leading-relaxed text-foreground">{data.summary}</p>
      </div>

      {/* === V1.6: Move Attribution === */}
      {data.attribution && data.attribution.btcActualMove !== 0 && data.attribution.availableFactors > 0 && (
        <section>
          <SectionHeader icon={BarChart3} label="Move Attribution" />
          <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
            <p className="text-xs text-foreground-secondary leading-relaxed">{data.attributionText}</p>
            {/* Factor contributions bar */}
            <div className="space-y-2">
              {data.attribution.factors.filter(f => f.isAvailable).map((f) => {
                const pct = data.attribution.btcActualMove !== 0
                  ? Math.min(Math.abs(f.expectedBtcContribution / data.attribution.btcActualMove) * 100, 100)
                  : 0;
                return (
                  <div key={f.signalId} className="flex items-center gap-3 text-xs">
                    <span className="w-20 text-foreground-secondary truncate">{f.signalLabel}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", f.expectedBtcContribution >= 0 ? "bg-success" : "bg-danger")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn("font-mono tabular-nums w-14 text-right", f.expectedBtcContribution >= 0 ? "text-success" : "text-danger")}>
                      {f.expectedBtcContribution >= 0 ? "+" : ""}{f.expectedBtcContribution.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
              {/* Unexplained */}
              <div className="flex items-center gap-3 text-xs pt-1 border-t border-border">
                <span className="w-20 text-foreground-secondary truncate font-semibold">Unexplained</span>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", data.attribution.unexplainedRatio > 1 ? "bg-danger" : "bg-warning")}
                    style={{ width: `${Math.min(data.attribution.btcActualMove !== 0 ? Math.abs(data.attribution.unexplained / data.attribution.btcActualMove) * 100 : 0, 100)}%` }}
                  />
                </div>
                <span className={cn("font-mono tabular-nums w-14 text-right font-semibold", data.attribution.unexplained >= 0 ? "text-success" : "text-danger")}>
                  {data.attribution.unexplained >= 0 ? "+" : ""}{data.attribution.unexplained.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === Cross-Signal Analysis + Severity Scores === */}
      {data.cross_signals && data.cross_signals.totalTestable > 0 && (
        <section>
          <SectionHeader icon={GitCompare} label="Cross-Signal Analysis" />
          <div className={cn("rounded-xl border p-5 space-y-4", data.cross_signals.overall === "divergent" ? "border-warning/30 bg-warning-subtle/20" : data.cross_signals.overall === "mixed" ? "border-warning/15 bg-surface-elevated" : "border-success/15 bg-success-subtle/10")}>
            <div className="flex items-start gap-2.5">
              <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border", data.cross_signals.overall === "supportive" ? "text-success bg-success-subtle border-success/20" : data.cross_signals.overall === "divergent" ? "text-warning bg-warning-subtle border-warning/20" : data.cross_signals.overall === "mixed" ? "text-warning bg-warning-subtle/50 border-warning/15" : "text-muted bg-surface border-border")}>{data.cross_signals.overall.toUpperCase()}</span>
              <p className="text-xs text-foreground-secondary leading-relaxed">{data.cross_signals.summary}</p>
            </div>
            {data.cross_signals.confirmedPatterns.length > 0 && (
              <div className="space-y-1">
                {data.cross_signals.confirmedPatterns.map((c) => {
                  const aA = c.signalA.direction === "rising" ? "↑" : c.signalA.direction === "falling" ? "↓" : "→";
                  const bA = c.signalB.direction === "rising" ? "↑" : c.signalB.direction === "falling" ? "↓" : "→";
                  return (<div key={c.id} className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 bg-surface/50"><CheckCircle2 className="h-3 w-3 text-success shrink-0"/><span className="text-foreground-secondary">{c.signalA.label} <span className="font-mono text-foreground">{aA}</span> + {c.signalB.label} <span className="font-mono text-foreground">{bA}</span></span><span className="text-muted">— as expected</span></div>);
                })}
              </div>
            )}
            {data.cross_signals.rankedDivergences && data.cross_signals.rankedDivergences.length > 0 && (
              <div className="space-y-2">
                {data.cross_signals.rankedDivergences.map((d) => {
                  const score = d.severityScore;
                  const label = severityLabel(score);
                  const aA = d.signalA.direction === "rising" ? "↑" : d.signalA.direction === "falling" ? "↓" : "→";
                  const bA = d.signalB.direction === "rising" ? "↑" : d.signalB.direction === "falling" ? "↓" : "→";
                  return (<div key={d.id} className={cn("rounded-lg border px-4 py-3 space-y-1.5", severityColor(score))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-warning shrink-0"/>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
                      </div>
                      <span className="text-xs font-mono font-bold tabular-nums">{score.toFixed(1)}<span className="text-muted">/10</span></span>
                    </div>
                    <p className="text-xs text-foreground-secondary leading-relaxed">
                      <span className="font-mono text-foreground">{d.signalA.label} {aA}</span>{" normally → "}<span className="font-mono text-foreground">{d.signalB.label} {d.expectation.correlation === "inverse" ? (aA === "↑" ? "↓" : "↑") : aA}</span>, but <span className="font-mono text-foreground">{d.signalB.label} {bA}</span>
                    </p>
                    <p className="text-xs text-muted italic leading-relaxed">{d.interpretation}</p>
                  </div>);
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* === Assessable Narratives === */}
      {data.narratives.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Layers} label={`Narratives (${assessableCount}/${totalCount} assessable)`} />

          <div className="grid gap-3">
            {data.narratives.map((n, i) => (
              <div
                key={n.id}
                className="group rounded-xl border border-border bg-surface-elevated p-5 space-y-4 transition-all hover:border-border-light hover:bg-surface-hover"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-muted tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h5 className="text-sm font-bold tracking-tight text-foreground">{n.name}</h5>
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-success/20 bg-success-subtle text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Assessable
                      </span>
                    </div>

                    {/* Reasoning */}
                    <p className="text-xs text-foreground-secondary leading-relaxed mt-1">{n.reasoning}</p>

                    {/* Directional assessment */}
                    {n.directionalAssessment && (
                      <div className="flex items-start gap-1.5 mt-2 text-[11px] text-foreground-secondary/80 italic leading-relaxed">
                        <ArrowRight className="h-3 w-3 mt-0.5 text-accent/60 shrink-0" />
                        {n.directionalAssessment}
                      </div>
                    )}
                  </div>
                </div>

                {/* Indicator evidence grid */}
                {n.indicators.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-accent/70" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Evidence</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {n.indicators.map((ind, j) => (
                        <div
                          key={j}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 transition-colors",
                            ind.isLive
                              ? "bg-background group-hover:bg-background-deep"
                              : "bg-warning-subtle/30 border border-warning/10"
                          )}
                        >
                          <SignalIcon signal={ind.signal} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] text-muted truncate leading-tight">{ind.label}</p>
                              <LiveTag isLive={ind.isLive} />
                              {ind.direction && <DirectionTag direction={ind.direction} />}
                            </div>
                            <p
                              className={cn(
                                "text-xs font-mono font-semibold truncate leading-tight mt-0.5",
                                !ind.isLive
                                  ? "text-muted italic"
                                  : ind.signal === "bullish"
                                    ? "text-success"
                                    : ind.signal === "bearish"
                                      ? "text-danger"
                                      : "text-foreground-secondary"
                              )}
                            >
                              {ind.value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === Not Assessable === */}
      {data.not_assessable.length > 0 && (
        <section>
          <SectionHeader icon={AlertTriangle} label="Not Assessable" />
          <div className="rounded-xl border border-warning/20 bg-warning-subtle/30 p-4 space-y-3">
            <p className="text-xs text-foreground-secondary leading-relaxed">
              {data.not_assessable.length} narrative{data.not_assessable.length > 1 ? "s" : ""}{" "}
              cannot be evaluated — required data signals are unavailable. Signals map to narratives, not the other way around.
            </p>
            <div className="space-y-2">
              {data.not_assessable.map((n) => (
                <div key={n.id} className="flex items-start gap-2.5 text-xs rounded-lg bg-surface/50 px-3 py-2.5 border border-border">
                  <XCircle className="h-3.5 w-3.5 text-muted mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground-secondary">{n.name}</span>
                      <span className="text-muted">—</span>
                      <span className="text-muted">missing: {n.missingSignals.join(", ")}</span>
                    </div>
                    <p className="text-muted mt-0.5 leading-relaxed">{n.directionalLogic}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === Supporting Evidence === */}
      {data.evidence.length > 0 && (
        <section>
          <SectionHeader icon={Lightbulb} label="Supporting Evidence" />
          <div className="space-y-0.5">
            {data.evidence.map((e, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3.5 py-2.5 transition-colors hover:bg-surface-hover group">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0 group-hover:bg-accent transition-colors" />
                <span className="text-sm text-foreground-secondary leading-relaxed">{e}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === Risk Factors === */}
      {data.risks.length > 0 && (
        <section>
          <SectionHeader icon={ShieldAlert} label="Risk Factors" />
          <div className="space-y-0.5">
            {data.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3.5 py-2.5 transition-colors hover:bg-surface-hover group">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0 group-hover:bg-warning transition-colors" />
                <span className="text-sm text-foreground-secondary leading-relaxed">{r}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
