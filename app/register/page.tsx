"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Mail,
} from "lucide-react";

function CreateAccountForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/divergences";

  const passwordMinLength = 8;
  const passwordValid = password.length >= passwordMinLength;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = email && passwordValid && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setError(`Password must be at least ${passwordMinLength} characters.`);
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  // ——— Success state ———
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-card p-8 w-full max-w-sm space-y-6 text-center animate-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle border border-success/20">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight">Check your email</h2>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              We&apos;ve sent a confirmation link to{" "}
              <span className="text-foreground font-medium">{email}</span>.
              Click the link to verify your account and continue.
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <div className="rounded-lg bg-surface-elevated border border-border p-4 text-left">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Next step</p>
                  <p className="text-xs text-foreground-secondary">
                    Open your inbox, find the email from Supabase, and click
                    &ldquo;Confirm your email.&rdquo; You&apos;ll be redirected
                    back to the terminal.
                  </p>
                </div>
              </div>
            </div>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full h-10 rounded-lg font-medium gap-2"
              >
                Return to Sign In
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ——— Register form ———
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card p-8 w-full max-w-sm space-y-6 animate-in">
        {/* Brand */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent-subtle border border-accent/20">
            <svg
              className="h-5 w-5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-foreground-secondary mt-1">
              Start building market research memos
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary ml-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-lg bg-background border-border text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary ml-1">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={`At least ${passwordMinLength} characters`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={passwordMinLength}
                  className="h-11 rounded-lg bg-background border-border text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Password strength hint */}
              {password.length > 0 && !passwordValid && (
                <p className="text-[11px] text-warning ml-1 mt-1">
                  Must be at least {passwordMinLength} characters
                </p>
              )}
              {passwordValid && (
                <p className="text-[11px] text-success ml-1 mt-1">
                  Password looks good
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={cn(
                    "h-11 rounded-lg bg-background border-border text-sm pr-10",
                    confirmPassword.length > 0 &&
                      !passwordsMatch &&
                      "border-danger/50 focus-visible:border-danger/60 focus-visible:ring-danger/20"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-danger ml-1 mt-1">
                  Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-[11px] text-success ml-1 mt-1">
                  Passwords match
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-danger bg-danger-subtle rounded-lg px-3 py-2.5 border border-danger/20 leading-relaxed">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-lg font-semibold tracking-wide bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/25 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            disabled={!canSubmit}
          >
            {loading ? (
              "Creating account…"
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <UserPlus className="h-4 w-4" />
                Create Account
              </span>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-3 text-muted font-medium">
              Already have an account?
            </span>
          </div>
        </div>

        <Link href="/login" className="block">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-lg font-medium"
          >
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <CreateAccountForm />
    </Suspense>
  );
}
