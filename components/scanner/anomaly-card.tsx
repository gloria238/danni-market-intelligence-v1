"use client";

import { cn } from "@/lib/utils";
import { severityLabel, severityColor } from "@/lib/ranking";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { SignalDirection } from "@/lib/signals";

export interface AnomalyCardData {
  id: string;
  signalA: { label: string; value: string; direction: SignalDirection | null };
  signalB: { label: string; value: string; direction: SignalDirection | null };
  description: string;
  interpretation: string;
  severityScore: number;
  type: "divergence" | "confirmed";
  resolutionSignal: string | null;
  unexplainedMove?: number;
}

function DirIcon({ d }: { d: SignalDirection | null }) {
  if (d === "rising") return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (d === "falling") return <TrendingDown className="h-3.5 w-3.5 text-danger" />;
  return <Minus className="h-3.5 w-3.5 text-muted" />;
}

export function AnomalyCard({ data }: { data: AnomalyCardData }) {
  const score = data.severityScore;
  const label = severityLabel(score);
  const aA = data.signalA.direction === "rising" ? "↑" : data.signalA.direction === "falling" ? "↓" : "→";
  const bA = data.signalB.direction === "rising" ? "↑" : data.signalB.direction === "falling" ? "↓" : "→";

  return (
    <Link href={`/divergences/${data.id}`}>
      <div className="group glass-card p-5 space-y-3 transition-all hover:border-border-light hover:bg-surface-hover cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <DirIcon d={data.signalA.direction} />
            <span className="text-sm font-bold text-foreground">{data.signalA.label}</span>
            <span className="text-muted text-xs">vs</span>
            <DirIcon d={data.signalB.direction} />
            <span className="text-sm font-bold text-foreground">{data.signalB.label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border", severityColor(score))}>
              {label}
            </span>
            <span className="text-lg font-mono font-bold tabular-nums">{score.toFixed(1)}</span>
          </div>
        </div>

        {/* Body */}
        <p className="text-xs text-foreground-secondary leading-relaxed line-clamp-2">{data.interpretation}</p>

        {/* Directional summary */}
        <div className="flex items-center gap-2 text-xs rounded-lg bg-surface px-3 py-2">
          <span className="font-mono text-foreground">{data.signalA.label} {aA}</span>
          <span className="text-muted">normally →</span>
          <span className="font-mono text-foreground">{data.signalB.label} {data.type === "divergence" ? (aA === "↑" ? "↓" : aA === "↓" ? "↑" : aA) : aA}</span>
          <span className="text-muted">but</span>
          <span className="font-mono text-foreground">{data.signalB.label} {bA}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-[10px] text-muted">
            {data.unexplainedMove != null && (
              <span className="bg-danger-subtle text-danger rounded px-1.5 py-0.5 font-mono border border-danger/10">
                {data.unexplainedMove >= 0 ? "+" : ""}{data.unexplainedMove.toFixed(1)}% unexplained
              </span>
            )}
            {data.resolutionSignal && (
              <span>Resolve: {data.resolutionSignal}</span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium group-hover:underline">
            Deep Dive <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
