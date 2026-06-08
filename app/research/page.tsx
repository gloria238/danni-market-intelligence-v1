"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowUp, Loader2, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MemoRenderer } from "@/components/research/memo-renderer";
import type { ResearchOutput } from "@/lib/ai";
import { useLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: ResearchOutput;
}

const EXAMPLES = [
  "Why is BTC rising today?",
  "What's driving gold to all-time highs?",
  "Is the dollar weakness structural?",
  "How to position for rate cuts?",
];

export default function ResearchPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login?redirect=/research");
      } else {
        setAuthChecked(true);
      }
    };
    check();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async () => {
    const q = question.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: ResearchOutput = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.summary,
        data,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header — matches scanner nav pattern */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle border border-accent/20">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Danni Research
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <Link href="/divergences" className="text-xs text-muted hover:text-foreground-secondary transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            {t("nav.scanner")}
          </Link>
          <Link href="/timeline" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("nav.timeline")}</Link>
          <Link href="/patterns" className="text-xs text-muted hover:text-foreground-secondary transition-colors">{t("nav.library")}</Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-surface">
            <LogOut className="h-3 w-3" />{t("nav.sign_out")}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        {messages.length === 0 ? (
          /* Empty state — centered, minimal */
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated border border-border mb-6">
              <Sparkles className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Ask a Market Question
            </h2>
            <p className="text-sm text-foreground-secondary max-w-sm mb-8">
              Get a structured investment memo with narratives, evidence, and
              risk analysis.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuestion(example)}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs text-foreground-secondary hover:text-foreground hover:border-border-light hover:bg-surface-hover transition-all cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl rounded-br-md bg-accent-subtle border border-accent/20 px-5 py-3.5">
                      <p className="text-sm text-foreground leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <MemoRenderer data={msg.data!} />
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 text-muted animate-in">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing markets…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar — floating, premium */}
      <div className="border-t border-border bg-background px-4 py-5 sticky bottom-0">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-start">
            <Textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask a market question…"
              className="min-h-[56px] resize-none pr-14 rounded-2xl bg-surface border-border text-sm placeholder:text-muted focus-visible:border-accent/40 focus-visible:ring-1 focus-visible:ring-accent/30 transition-all"
              rows={1}
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
              className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all disabled:opacity-30 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2.5 text-xs text-muted text-center">
            Press Enter to submit · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
