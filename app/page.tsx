import Link from "next/link";
import { ArrowRight, BarChart3, Layers, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function FeatureCard({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3">
      <Icon className="h-4 w-4 text-accent shrink-0" />
      <span className="text-xs font-medium text-foreground-secondary tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-10">
        {/* Brand mark */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle border border-accent/20">
            <BarChart3 className="h-7 w-7 text-accent" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl whitespace-nowrap">
            Danni Research Terminal
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed max-w-lg mx-auto">
            Ask any market question and receive a structured investment memo in
            seconds. AI-powered analysis, not guesswork.
          </p>
        </div>

        {/* Feature grid — bento-style */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <FeatureCard icon={BarChart3} label="Key Narratives" />
          <FeatureCard icon={ShieldAlert} label="Risk Analysis" />
          <FeatureCard icon={Layers} label="Evidence-Backed" />
        </div>

        {/* CTA */}
        <div className="pt-2">
          <Link href="/divergences">
            <Button
              size="lg"
              className="gap-2.5 px-8 h-12 text-sm font-semibold tracking-wide rounded-xl bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Open Scanner
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted">
          Cross-signal divergence detection · Narrative-driven analysis · AI reasoning
        </p>
      </div>
    </div>
  );
}
