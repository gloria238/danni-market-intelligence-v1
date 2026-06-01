"use client";

import type { ResearchOutput } from "@/lib/ai";
import type { CoverageLevel } from "@/lib/signals";
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
  Signal,
  Wifi,
  WifiOff,
} from "lucide-react";

/* ——— Sub-components ——— */

const COVERAGE_META: Record<
  CoverageLevel,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  "Strongly Supported": {
    label: "Strong",
    color: "text-success",
    bg: "bg-success-subtle",
    border: "border-success/20",
    icon: Wifi,
  },
  "Partially Supported": {
    label: "Partial",
    color: "text-warning",
    bg: "bg-warning-subtle",
    border: "border-warning/20",
    icon: Signal,
  },
  "Insufficient Data": {
    label: "No Data",
    color: "text-danger",
    bg: "bg-danger-subtle",
    border: "border-danger/20",
    icon: WifiOff,
  },
};

function CoverageBadge({ level }: { level: CoverageLevel }) {
  const meta = COVERAGE_META[level];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
        meta.color,
        meta.bg,
        meta.border
      )}
    >
      <Icon className="h-3 w-3" />
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

function LiveTag({ isLive }: { isLive: boolean }) {
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-success bg-success-subtle rounded px-1 py-0 font-mono font-semibold uppercase border border-success/20">
        <Wifi className="h-2.5 w-2.5" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-muted bg-surface rounded px-1 py-0 font-mono uppercase border border-border">
      Est
    </span>
  );
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

  const coveragePct = data.signal_coverage.total > 0
    ? Math.round((data.signal_coverage.available / data.signal_coverage.total) * 100)
    : 0;

  return (
    <div className="glass-card p-6 space-y-7 animate-in">
      {/* === Executive Summary === */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Research Memo
            </h3>
          </div>

          {/* Status badges */}
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
                <WifiOff className="h-3 w-3" />
                No live data
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
                coveragePct >= 70
                  ? "bg-success"
                  : coveragePct >= 40
                    ? "bg-warning"
                    : "bg-danger"
              )}
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-muted tabular-nums whitespace-nowrap">
            {data.signal_coverage.available}/{data.signal_coverage.total} signals
          </span>
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
                  n.coverage === "Insufficient Data"
                    ? "border-danger/15 bg-surface-elevated opacity-60"
                    : n.coverage === "Partially Supported"
                      ? "border-warning/15 bg-surface-elevated"
                      : "border-border bg-surface-elevated hover:border-border-light hover:bg-surface-hover"
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-muted tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h5 className="text-sm font-bold tracking-tight text-foreground">
                        {n.name}
                      </h5>
                      <CoverageBadge level={n.coverage} />
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
                              <p className="text-[11px] text-muted truncate leading-tight">
                                {ind.label}
                              </p>
                              <LiveTag isLive={ind.isLive} />
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

      {/* === Coverage Analysis — data-limited narratives === */}
      {data.insufficient_data_narratives.length > 0 && (
        <section>
          <SectionHeader icon={AlertTriangle} label="Coverage Analysis" />
          <div className="rounded-xl border border-warning/20 bg-warning-subtle/30 p-4 space-y-3">
            <p className="text-xs text-foreground-secondary leading-relaxed">
              {data.insufficient_data_narratives.length} narrative
              {data.insufficient_data_narratives.length > 1 ? "s" : ""} could
              not be assessed due to missing data. Adding DXY, ETF flow, and
              Treasury yield data sources would improve coverage significantly.
            </p>
            <div className="space-y-1.5">
              {data.insufficient_data_narratives.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warning/50 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      {n.name}
                    </span>
                    <span className="text-muted ml-2">
                      missing: {n.missingSignals.join(", ")}
                    </span>
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
    </div>
  );
}
