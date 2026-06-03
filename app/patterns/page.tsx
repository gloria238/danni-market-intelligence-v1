// V3: Divergence Library — browsable historical signal pair database.

import { getAllPairStats, type PairHistoricalStats } from "@/lib/patterns";
import {
  Sparkles, TrendingUp, TrendingDown, ArrowRight,
  BarChart3, Clock,
} from "lucide-react";
import Link from "next/link";
import { EXPECTATION_REGISTRY } from "@/lib/expectations";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PatternsPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login?redirect=/patterns");

  const allStats = await getAllPairStats();

  const hasData = allStats.some((s) => s.totalOccurrences > 0);

  // Sort for sections
  const mostBullish = [...allStats]
    .filter((s) => s.totalOccurrences > 0)
    .sort((a, b) => b.bullishResolutionRate - a.bullishResolutionRate);

  const mostBearish = [...allStats]
    .filter((s) => s.totalOccurrences > 0)
    .sort((a, b) => b.bearishResolutionRate - a.bearishResolutionRate);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Divergence Library</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Historical signal pair outcomes — resolution rates, durations, reliability
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/timeline" className="text-xs text-muted hover:text-foreground-secondary transition-colors">Timeline</Link>
            <Link
              href="/divergences"
              className="text-xs text-muted hover:text-foreground-secondary transition-colors"
            >
            ← Back to Scanner
          </Link>
        </div>
        </div>

        {/* Empty state */}
        {!hasData && (
          <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
            <BarChart3 className="h-8 w-8 text-muted mx-auto mb-4" />
            <p className="text-sm text-foreground-secondary font-medium">
              Historical database building
            </p>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              Signal history is recorded daily via automated scans. Check back after 7+ days of data accumulation for meaningful pair statistics.
            </p>
            <Link
              href="/divergences"
              className="inline-flex items-center gap-1 mt-4 text-xs text-accent hover:underline"
            >
              Open Scanner <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Most Bullish */}
        {mostBullish.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-success">
                Most Bullish Divergences
              </h2>
            </div>
            <PairGrid stats={mostBullish.slice(0, 4)} highlight="bullish" />
          </section>
        )}

        {/* Most Bearish */}
        {mostBearish.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-danger">
                Most Bearish Divergences
              </h2>
            </div>
            <PairGrid stats={mostBearish.slice(0, 4)} highlight="bearish" />
          </section>
        )}

        {/* All Pairs */}
        {allStats.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-accent">
                All Pairs
              </h2>
            </div>
            <PairGrid stats={allStats} highlight={null} />
          </section>
        )}
      </div>
    </div>
  );
}

function PairGrid({
  stats,
  highlight,
}: {
  stats: PairHistoricalStats[];
  highlight: "bullish" | "bearish" | null;
}) {
  return (
    <div className="grid gap-3">
      {stats.map((stat) => {
        const exp = EXPECTATION_REGISTRY.find((e) => e.id === stat.pairId);
        return (
          <Link
            key={stat.pairId}
            href={`/divergences/${stat.pairId}`}
            className="group glass-card p-5 space-y-3 transition-all hover:border-border-light hover:bg-surface-hover"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {stat.signalALabel}
                </span>
                <span className="text-muted text-xs">vs</span>
                <span className="text-sm font-bold text-foreground">
                  {stat.signalBLabel}
                </span>
              </div>
              {exp && (
                <span className="text-[10px] text-muted font-mono">
                  {exp.correlation === "inverse" ? "inverse" : "direct"} ·{" "}
                  {exp.strength}
                </span>
              )}
            </div>

            {/* Resolution bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>
                  {stat.totalOccurrences} occurrences
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  avg {stat.avgDurationDays.toFixed(1)}d
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-border">
                <div
                  className="bg-success transition-all"
                  style={{ width: `${stat.bullishResolutionRate}%` }}
                />
                <div
                  className="bg-danger transition-all"
                  style={{ width: `${stat.bearishResolutionRate}%` }}
                />
                <div
                  className="bg-muted/30"
                  style={{
                    width: `${100 - stat.bullishResolutionRate - stat.bearishResolutionRate}%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-success font-mono">
                  ▲ {stat.bullishResolutionRate}% bullish
                </span>
                <span className="text-danger font-mono">
                  ▼ {stat.bearishResolutionRate}% bearish
                </span>
              </div>
            </div>

            {/* Deep dive arrow */}
            <div className="flex items-center justify-end">
              <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium group-hover:underline">
                Deep Dive <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
