"use client";

import type { ResearchOutput } from "@/lib/ai";
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
} from "lucide-react";

/* ——— Sub-components ——— */

function ConfidenceBar({ value, height }: { value: number; height?: "sm" | "md" }) {
  const h = height === "sm" ? "h-1" : "h-1.5";
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("flex-1 rounded-full bg-border overflow-hidden", h)}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            value >= 70
              ? "bg-success"
              : value >= 40
                ? "bg-warning"
                : "bg-danger"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted tabular-nums w-9 text-right">
        {value}%
      </span>
    </div>
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
          {data.market_context_used && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-success bg-success-subtle rounded-full px-2.5 py-0.5 font-medium">
              <Database className="h-3 w-3" />
              Live data
            </span>
          )}
        </div>
        <p className="text-[15px] font-medium leading-relaxed text-foreground">
          {data.summary}
        </p>
      </div>

      {/* === Key Narratives (bento grid cards) === */}
      {data.narratives.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Layers} label="Key Narratives" />

          <div className="grid gap-3">
            {data.narratives.map((n, i) => (
              <div
                key={n.id}
                className="group rounded-xl border border-border bg-surface-elevated p-5 space-y-4 transition-all hover:border-border-light hover:bg-surface-hover"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-muted tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h5 className="text-sm font-bold tracking-tight text-foreground">
                        {n.name}
                      </h5>
                    </div>
                    <p className="text-xs text-foreground-secondary leading-relaxed">
                      {n.reasoning}
                    </p>
                  </div>

                  {/* Confidence gauge */}
                  <div className="shrink-0 flex flex-col items-center">
                    <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                      {n.confidence}
                    </span>
                    <span className="text-[10px] text-muted uppercase tracking-widest">
                      %
                    </span>
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
                                ind.signal === "bullish" && "text-success",
                                ind.signal === "bearish" && "text-danger",
                                ind.signal === "neutral" && "text-foreground-secondary"
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

                <ConfidenceBar value={n.confidence} height="sm" />
              </div>
            ))}
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

      {/* === Overall Confidence (footer bar) === */}
      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Overall Confidence
            </span>
          </div>
          <span
            className={cn(
              "text-lg font-mono font-bold tabular-nums",
              data.confidence_score >= 70
                ? "text-success"
                : data.confidence_score >= 40
                  ? "text-warning"
                  : "text-danger"
            )}
          >
            {data.confidence_score}%
          </span>
        </div>
        <ConfidenceBar value={data.confidence_score} />
        <p className="mt-3 text-xs text-muted leading-relaxed">
          {data.confidence_score >= 70
            ? "Multiple converging signals support this analysis with high conviction."
            : data.confidence_score >= 40
              ? "Mixed signals — monitor closely and await confirmation before acting."
              : "Elevated uncertainty — this thesis has limited supporting evidence. Position size accordingly."}
        </p>
      </div>
    </div>
  );
}
