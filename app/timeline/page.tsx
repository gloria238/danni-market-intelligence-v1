// V5.5: Research Timeline — chronological market event visualization.
//
// Stitches signal_history + divergence_observations into a single
// vertical timeline with color-coded event markers.
// Pure data visualization — no LLM.

import { getTimeline, type TimelineEvent } from "@/lib/timeline";
import { EXPECTATION_REGISTRY } from "@/lib/expectations";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus, Clock, Filter,
} from "lucide-react";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; pair?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login?redirect=/timeline");

  const params = await searchParams;
  const defaultFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);

  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;
  const pair = params.pair;

  const timeline = await getTimeline(from, to, pair);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Research Timeline</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              {from} → {to} · {timeline.totalEvents} events
            </p>
          </div>
          <Link
            href="/divergences"
            className="text-xs text-muted hover:text-foreground-secondary transition-colors"
          >
            ← Back to Scanner
          </Link>
        </div>

        {/* Filters */}
        <form className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-muted uppercase tracking-wider">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-muted uppercase tracking-wider">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          {pair && (
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 text-muted" />
              <span className="text-xs text-foreground-secondary font-mono">{pair}</span>
              <Link href="/timeline" className="text-[10px] text-muted hover:text-danger transition-colors">
                ✕ clear
              </Link>
            </div>
          )}
          <button
            type="submit"
            className="rounded-lg bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            Apply
          </button>
        </form>

        {/* Signal pair quick filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted uppercase tracking-wider">Quick filter:</span>
          {EXPECTATION_REGISTRY.map((exp) => (
            <Link
              key={exp.id}
              href={`/timeline?from=${from}&to=${to}&pair=${exp.id}`}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${pair === exp.id
                ? "bg-accent text-white"
                : "bg-surface border border-border text-muted hover:text-foreground-secondary hover:border-border-light"
              }`}
            >
              {exp.id.replace(/_/g, " ")}
            </Link>
          ))}
        </div>

        {/* Timeline */}
        {timeline.events.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
            <Clock className="h-8 w-8 text-muted mx-auto mb-4" />
            <p className="text-sm text-foreground-secondary font-medium">No events found</p>
            <p className="text-xs text-muted mt-1">
              Try a wider date range or different signal pair filter. Timeline data accumulates as signal history grows.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-0">
              {timeline.events.map((event, i) => (
                <TimelineNode
                  key={event.id}
                  event={event}
                  isFirst={i === 0}
                  isLast={i === timeline.events.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ——— Timeline Node ——— */

function TimelineNode({
  event,
  isFirst,
  isLast,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
}) {
  const icon = getEventIcon(event);
  const colors = getEventColors(event);

  return (
    <div className={`relative flex items-start gap-4 pb-5 ${isFirst ? "" : ""}`}>
      {/* Node marker */}
      <div
        className={`relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-2 ${colors.bg} ${colors.border}`}
      >
        {icon}
      </div>

      {/* Content card */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted font-mono">{event.date}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${colors.badge}`}>
            {event.type === "signal_move" ? "Signal" : event.type === "divergence" ? "Divergence" : "Resolution"}
          </span>
          {event.severity != null && (
            <span className="text-[10px] text-muted font-mono">
              {event.severity.toFixed(1)}
            </span>
          )}
        </div>

        <p className="text-sm font-semibold text-foreground leading-snug">{event.title}</p>
        <p className="text-xs text-foreground-secondary mt-0.5 leading-relaxed">{event.detail}</p>

        {/* Resolution direction indicator */}
        {event.resolution && (
          <span
            className={`inline-flex items-center gap-1 mt-2 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
              event.resolution.includes("bullish")
                ? "text-success border-success/20 bg-success-subtle"
                : event.resolution.includes("bearish")
                  ? "text-danger border-danger/20 bg-danger-subtle"
                  : "text-muted border-border bg-surface"
            }`}
          >
            {event.resolution.includes("bullish") ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : event.resolution.includes("bearish") ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {event.resolution}
          </span>
        )}
      </div>
    </div>
  );
}

/* ——— Event icon + colors ——— */

function getEventIcon(event: TimelineEvent) {
  const cls = "h-4 w-4";

  if (event.type === "resolution") {
    const color =
      event.resolution?.includes("bullish")
        ? "text-success"
        : event.resolution?.includes("bearish")
          ? "text-danger"
          : "text-muted";
    return <CheckCircle2 className={`${cls} ${color}`} />;
  }

  if (event.type === "divergence") {
    return <AlertTriangle className={`${cls} text-warning`} />;
  }

  // signal_move
  if (event.direction === "rising") {
    return <TrendingUp className={`${cls} text-success`} />;
  }
  return <TrendingDown className={`${cls} text-danger`} />;
}

function getEventColors(event: TimelineEvent) {
  if (event.type === "resolution") {
    const isBullish = event.resolution?.includes("bullish");
    return {
      bg: isBullish ? "bg-success-subtle/50" : "bg-danger-subtle/50",
      border: isBullish ? "border-success/30" : "border-danger/30",
      badge: isBullish
        ? "text-success bg-success-subtle border border-success/20"
        : "text-danger bg-danger-subtle border border-danger/20",
    };
  }

  if (event.type === "divergence") {
    return {
      bg: "bg-warning-subtle/50",
      border: "border-warning/40",
      badge: "text-warning bg-warning-subtle border border-warning/20",
    };
  }

  // signal_move
  const isRising = event.direction === "rising";
  return {
    bg: isRising ? "bg-success-subtle/30" : "bg-danger-subtle/30",
    border: isRising ? "border-success/25" : "border-danger/25",
    badge: isRising
      ? "text-success bg-success-subtle border border-success/20"
      : "text-danger bg-danger-subtle border border-danger/20",
  };
}
