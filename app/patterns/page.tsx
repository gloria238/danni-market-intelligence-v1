// V3: Divergence Library — browsable historical signal pair database.

"use client";

import { useEffect, useState } from "react";
import { getAllPairStats, type PairHistoricalStats } from "@/lib/patterns";
import {
  Sparkles, TrendingUp, TrendingDown, ArrowRight,
  BarChart3, Clock, Loader2,
} from "lucide-react";
import Link from "next/link";
import { EXPECTATION_REGISTRY } from "@/lib/expectations";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

export default function PatternsPage() {
  const { t } = useLocale();
  const [allStats, setAllStats] = useState<PairHistoricalStats[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const c = createClient();
    c.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/login?redirect=/patterns");
      else setAuthChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    getAllPairStats().then((stats) => {
      setAllStats(stats);
      setLoaded(true);
    });
  }, [authChecked]);

  const hasData = allStats.some((s) => s.totalOccurrences > 0);

  const mostBullish = [...allStats]
    .filter((s) => s.totalOccurrences > 0)
    .sort((a, b) => b.bullishResolutionRate - a.bullishResolutionRate);

  const mostBearish = [...allStats]
    .filter((s) => s.totalOccurrences > 0)
    .sort((a, b) => b.bearishResolutionRate - a.bearishResolutionRate);

  if (!authChecked || !loaded) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted"/></div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("library.title")}</h1>
            <p className="text-sm text-foreground-secondary mt-1">{t("library.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <LocaleToggle />
            <Link href="/timeline" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("library.timeline")}</Link>
            <Link href="/divergences" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("library.back")}</Link>
          </div>
        </div>

        {!hasData && (
          <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
            <BarChart3 className="h-8 w-8 text-muted mx-auto mb-4" />
            <p className="text-sm text-foreground-secondary font-medium">{t("library.empty_title")}</p>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">{t("library.empty_desc")}</p>
            <Link
              href="/divergences"
              className="inline-flex items-center gap-1.5 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-white px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              {t("library.empty_cta")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {mostBullish.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-success">{t("library.most_bullish")}</h2>
            </div>
            <PairGrid stats={mostBullish.slice(0, 4)} highlight="bullish" t={t} />
          </section>
        )}

        {mostBearish.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-danger">{t("library.most_bearish")}</h2>
            </div>
            <PairGrid stats={mostBearish.slice(0, 4)} highlight="bearish" t={t} />
          </section>
        )}

        {allStats.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-accent">{t("library.all_pairs")}</h2>
            </div>
            <PairGrid stats={allStats} highlight={null} t={t} />
          </section>
        )}
      </div>
    </div>
  );
}

function PairGrid({
  stats,
  highlight,
  t,
}: {
  stats: PairHistoricalStats[];
  highlight: "bullish" | "bearish" | null;
  t: (key: string) => string;
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
                  {exp.correlation === "inverse" ? t("library.inverse") : t("library.direct")} ·{" "}
                  {exp.strength}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>{stat.totalOccurrences} {t("library.occurrences")}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("card.avg")} {stat.avgDurationDays.toFixed(1)}d
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-border">
                <div className="bg-success transition-all" style={{ width: `${stat.bullishResolutionRate}%` }} />
                <div className="bg-danger transition-all" style={{ width: `${stat.bearishResolutionRate}%` }} />
                <div className="bg-muted/30" style={{ width: `${100 - stat.bullishResolutionRate - stat.bearishResolutionRate}%` }} />
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-success font-mono">▲ {stat.bullishResolutionRate}% {t("library.bullish_label")}</span>
                <span className="text-danger font-mono">▼ {stat.bearishResolutionRate}% {t("library.bearish_label")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium group-hover:underline">
                {t("card.deep_dive")} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
