"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Sparkles, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MemoRenderer } from "@/components/research/memo-renderer";
import type { ResearchOutput } from "@/lib/ai";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: ResearchOutput;
}

export default function ResearchPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check auth on mount
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
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold text-sm tracking-tight">
            Danni Research Terminal
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-32 text-center">
            <Sparkles className="mb-4 h-8 w-8 text-muted" />
            <h2 className="text-xl font-semibold mb-2">
              Ask a Market Question
            </h2>
            <p className="text-sm text-muted max-w-md">
              Example: &quot;Why is Bitcoin rising today?&quot; or &quot;What is
              driving the S&P 500 sell-off?&quot;
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "Why is BTC rising?",
                "What's driving gold to all-time highs?",
                "Is the dollar weakness structural?",
                "How to position for rate cuts?",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuestion(example)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-muted transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent/15 border border-accent/20 px-4 py-3">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <MemoRenderer data={msg.data!} />
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing markets...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-start gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask a market question..."
              className="min-h-[52px] resize-none pr-12"
              rows={1}
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
              className="absolute right-2 top-2 h-8 w-8"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted text-center">
            Press Enter to submit · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
