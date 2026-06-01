import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-xl text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Danni Research Terminal
          </h1>
          <p className="text-lg text-muted leading-relaxed">
            AI-Powered Market Research. Ask any market question and receive a
            structured investment memo in seconds.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Executive Summary",
            "Key Narratives",
            "Risk Analysis",
            "Evidence-Backed",
          ].map((f) => (
            <span
              key={f}
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-muted"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/research">
            <Button size="lg" className="gap-2">
              Start Research
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
