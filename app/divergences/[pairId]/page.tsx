"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles, Loader2, LogOut, ArrowLeft, GitCompare, CheckCircle2, XCircle,
} from "lucide-react";
import { MemoRenderer } from "@/components/research/memo-renderer";
import type { ResearchOutput } from "@/lib/ai";
import type { EvidenceStrength } from "@/lib/evidence";

export default function DivergenceDetailPage({ params }: { params: Promise<{ pairId: string }> }) {
  const { pairId } = use(params);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResearchOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const c = createClient();
    c.auth.getSession().then(({ data: sessionData }) => {
      if (!sessionData.session) router.push("/login");
      else setAuthChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: `Analyze the ${pairId.replace(/_/g, " ")} signal pair divergence or confirmation. What does this relationship tell us about current market conditions? What narratives are connected to this signal pair?`,
          }),
        });
        if (!res.ok) throw new Error("Analysis failed");
        setData(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [authChecked, pairId]);

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
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/divergences" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground-secondary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Scanner
          </a>
          <span className="text-muted">/</span>
          <span className="font-mono text-xs text-foreground-secondary">{pairId}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle border border-accent/20">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground-secondary transition-colors">
            <LogOut className="h-3 w-3" />Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
              <p className="text-sm text-foreground-secondary">Analyzing {pairId}...</p>
            </div>
          )}
          {error && (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {data && (
            <>
              {/* V3: Historical pattern data */}
              {data.historicalPatterns && Object.entries(data.historicalPatterns).map(([id, match]: [string, any]) => (
                match.occurrences > 0 && (
                  <section key={id} className="glass-card p-5 space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Historical Pattern: {match.currentDescription}</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-surface px-3 py-2">
                        <div className="text-lg font-mono font-bold text-foreground">{match.occurrences}</div>
                        <div className="text-[10px] text-muted">Past Occurrences</div>
                      </div>
                      <div className="rounded-lg bg-success-subtle px-3 py-2">
                        <div className="text-lg font-mono font-bold text-success">{match.bullishResolution}%</div>
                        <div className="text-[10px] text-muted">Bullish Resolution</div>
                      </div>
                      <div className="rounded-lg bg-surface px-3 py-2">
                        <div className="text-lg font-mono font-bold text-foreground">{match.avgBtcMove >= 0 ? "+" : ""}{match.avgBtcMove}%</div>
                        <div className="text-[10px] text-muted">Avg BTC Move</div>
                      </div>
                    </div>
                    {match.recentMatches.length > 0 && (
                      <div className="text-[10px] text-muted space-y-0.5">
                        <span className="font-medium text-foreground-secondary">Recent matches:</span>
                        {match.recentMatches.map((rm: any, i: number) => (
                          <span key={i} className="ml-2">
                            {rm.date}: {rm.btcMoveAfter >= 0 ? "+" : ""}{rm.btcMoveAfter}%
                            {i < match.recentMatches.length - 1 ? " · " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </section>
                )
              ))}

              {/* V5: Evidence section */}
              {data.v5Evidence && (
                <section className="glass-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Evidence Analysis</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{data.v5Evidence.topExplanation.label}</span>
                    <EvidenceBadge strength={data.v5Evidence.topExplanation.strength} />
                  </div>
                  {data.v5Evidence.topExplanation.supporting.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-success">Supporting</span>
                      {data.v5Evidence.topExplanation.supporting.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-foreground-secondary">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                          {p.description}
                        </div>
                      ))}
                    </div>
                  )}
                  {data.v5Evidence.topExplanation.contradicting.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-danger">Contradicting</span>
                      {data.v5Evidence.topExplanation.contradicting.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-foreground-secondary">
                          <XCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" />
                          {p.description}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <MemoRenderer data={data} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceBadge({ strength }: { strength: EvidenceStrength }) {
  const colors = {
    Strong: "text-success border-success/20 bg-success-subtle",
    Moderate: "text-warning border-warning/20 bg-warning-subtle",
    Weak: "text-muted border-border bg-surface",
  };
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase border ${colors[strength]}`}>
      {strength}
    </span>
  );
}
