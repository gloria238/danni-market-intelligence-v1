"use client";

import type { ResearchOutput } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Database, Activity } from "lucide-react";

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
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
      <span className="text-xs font-mono text-muted tabular-nums w-8 text-right">
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

export function MemoRenderer({ data }: { data: ResearchOutput }) {
  if (!data) return null;

  return (
    <div className="glass-card p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header + data freshness */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-accent" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Research Memo
            </h3>
          </div>
          {data.market_context_used && (
            <div className="flex items-center gap-1 text-xs text-muted">
              <Database className="h-3 w-3" />
              <span>Real-time data</span>
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold leading-snug">{data.summary}</h2>
      </div>

      {/* Narratives with indicator evidence */}
      {data.narratives.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
            Key Narratives
          </h4>
          <div className="space-y-4">
            {data.narratives.map((n, i) => (
              <div
                key={n.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                {/* Narrative header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted font-mono">
                        #{i + 1}
                      </span>
                      <h5 className="text-sm font-semibold">{n.name}</h5>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {n.reasoning}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-lg font-mono font-bold">
                      {n.confidence}%
                    </span>
                    <p className="text-[10px] text-muted uppercase tracking-wide">
                      Confidence
                    </p>
                  </div>
                </div>

                {/* Indicator evidence grid */}
                {n.indicators.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-muted" />
                      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                        Evidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {n.indicators.map((ind, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 bg-card-hover rounded-md px-3 py-2"
                        >
                          <SignalIcon signal={ind.signal} />
                          <div className="min-w-0">
                            <p className="text-xs text-muted truncate">
                              {ind.label}
                            </p>
                            <p
                              className={cn(
                                "text-xs font-mono font-medium truncate",
                                ind.signal === "bullish" && "text-success",
                                ind.signal === "bearish" && "text-danger",
                                ind.signal === "neutral" && "text-muted"
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

                <ConfidenceBar value={n.confidence} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evidence */}
      {data.evidence.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Supporting Evidence
          </h4>
          <ul className="space-y-1.5">
            {data.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
                <span className="text-muted">{e}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Risks */}
      {data.risks.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Risk Factors
          </h4>
          <ul className="space-y-1.5">
            {data.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                <span className="text-muted">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Overall Confidence */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Overall Confidence
          </span>
          <span className="text-sm font-mono font-semibold">
            {data.confidence_score}%
          </span>
        </div>
        <ConfidenceBar value={data.confidence_score} />
        <p className="mt-2 text-xs text-muted">
          {data.confidence_score >= 70
            ? "Multiple converging signals support this analysis."
            : data.confidence_score >= 40
              ? "Mixed signals — monitor closely before acting."
              : "High uncertainty — limited supporting evidence available."}
        </p>
      </div>
    </div>
  );
}
