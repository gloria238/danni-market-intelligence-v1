"use client";

import type { ResearchOutput, ConfidenceLevel } from "@/lib/ai";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Activity,
  Target,
  ShieldAlert,
  Lightbulb,
  Layers,
  AlertTriangle,
  Info,
} from "lucide-react";

/* ——— Sub-components ——— */

const CONFIDENCE_META: Record<
  ConfidenceLevel,
  { label: string; color: string; bg: string; border: string }
> = {
  High: {
    label: "High",
    color: "text-success",
    bg: "bg-success-subtle",
    border: "border-success/20",
  },
  Medium: {
    label: "Medium",
    color: "text-warning",
    bg: "bg-warning-subtle",
    border: "border-warning/20",
  },
  Low: {
    label: "Low",
    color: "text-danger",
    bg: "bg-danger-subtle",
    border: "border-danger/20",
  },
};

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const meta = CONFIDENCE_META[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border",
        meta.color,
        meta.bg,
        meta.border
      )}
    >
      {meta.label}
    </span>
  );
}

function SignalIcon({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  if (signal === "bullish") {
    return <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />;
  }
  if (signal === "bearish") {
    return <TrendingDown className="h-3.5 w-3.5 text-danger shrink-0" />;
  }
  return <Minus className="h-3.5 w-3.5 text-muted shrink-0" />;
}

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-accent" />
      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </h4>
    </div>
  );
}

/* ——— Main Renderer ——— */

export function MemoRenderer({ data }: { data: ResearchOutput }) {
  if (!data) return null;

  const overallMeta = CONFIDENCE_META[data.confidence];

  return (
    <div className="glass-card p-6 space-y-7 animate-in">
      {/* === Executive Summary === */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Research Memo
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {data.premise_corrected && (
              <span className="inline-flex items-center gap-1 text-[11px] text-warning bg-warning-subtle rounded-full px-2.5 py-0.5 font-medium border border-warning/20">
                <AlertTriangle className="h-3 w-3" />
                Premise adjusted
              </span>
            )}
            {data.market_context_used ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-success bg-success-subtle rounded-full px-2.5 py-0.5 font-medium border border-success/20">
                <Database className="h-3 w-3" />
                Live data
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-warning bg-warning-subtle rounded-full px-2.5 py-0.5 font-medium border border-warning/20">
                <Info className="h-3 w-3" />
                No live data
              </span>
            )}
          </div>
        </div>
        <p className="text-[15px] font-medium leading-relaxed text-foreground">
          {data.summary}
        </p>
      </div>

      {/* === Key Narratives === */}
      {data.narratives.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Layers} label="Key Narratives" />

          <div className="grid gap-3">
            {data.narratives.map((n, i) => (
              <div
                key={n.id}
                className={cn(
                  "group rounded-xl border p-5 space-y-4 transition-all",
                  n.confidence === "Low"
                    ? "border-warning/20 bg-surface-elevated opacity-75"
                    : "border-border bg-surface-elevated hover:border-border-light hover:bg-surface-hover"
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-mono text-muted tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h5 className="text-sm font-bold tracking-tight text-foreground">
                        {n.name}
                      </h5>
                      <ConfidenceBadge level={n.confidence} />
                    </div>
                    <p className="text-xs text-foreground-secondary leading-relaxed">
                      {n.reasoning}
                    </p>
                  </div>
                </div>

                {/* Indicator evidence grid */}
                {n.indicators.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-accent/70" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                        Evidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {n.indicators.map((ind, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2.5 rounded-lg bg-background px-3.5 py-2.5 transition-colors group-hover:bg-background-deep"
                        >
                          <SignalIcon signal={ind.signal} />
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted truncate leading-tight">
                              {ind.label}
                            </p>
                            <p
                              className={cn(
                                "text-xs font-mono font-semibold truncate leading-tight mt-0.5",
                                ind.value === "N/A"
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

      {/* === Suppressed Narratives === */}
      {data.suppressed_narratives.length > 0 && (
        <section>
          <SectionHeader icon={AlertTriangle} label="Data-Limited Narratives" />
          <div className="rounded-lg border border-warning/20 bg-warning-subtle/50 px-4 py-3">
            <p className="text-xs text-foreground-secondary leading-relaxed">
              The following narratives were identified but could not be assessed
              with sufficient confidence due to missing data sources:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {data.suppressed_narratives.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded-md bg-surface border border-border px-2 py-0.5 text-[10px] font-mono text-muted"
                >
                  {id}
                </span>
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
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg px-3.5 py-2.5 transition-colors hover:bg-surface-hover group"
              >
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0 group-hover:bg-accent transition-colors" />
                <span className="text-sm text-foreground-secondary leading-relaxed">
                  {e}
                </span>
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
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg px-3.5 py-2.5 transition-colors hover:bg-surface-hover group"
              >
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0 group-hover:bg-warning transition-colors" />
                <span className="text-sm text-foreground-secondary leading-relaxed">
                  {r}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === Overall Confidence === */}
      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Overall Confidence
            </span>
          </div>
          <ConfidenceBadge level={data.confidence} />
        </div>
        <div className={cn("rounded-lg border px-4 py-3", overallMeta.bg, overallMeta.border)}>
          <p className={cn("text-xs leading-relaxed", overallMeta.color)}>
            {data.confidence_rationale}
          </p>
        </div>
      </div>
    </div>
  );
}
