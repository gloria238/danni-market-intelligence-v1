"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles, Loader2, LogOut, ArrowLeft, GitCompare,
} from "lucide-react";
import { MemoRenderer } from "@/components/research/memo-renderer";
import type { ResearchOutput } from "@/lib/ai";

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
          {data && <MemoRenderer data={data} />}
        </div>
      </div>
    </div>
  );
}
