# CLAUDE.md

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

5. Project-Specific Conventions (never break these)

## 5a. Email Confirmation Redirect

NEVER hardcode a URL for Supabase `emailRedirectTo`. Always use `window.location.origin` — it works everywhere automatically.

```
✅ emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`
❌ emailRedirectTo: `https://danni-terminal.vercel.app/auth/callback`
❌ emailRedirectTo: `http://localhost:3000/auth/callback`
❌ emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
```

This is a client component (`"use client"`), so `window.location.origin` is always available and always correct — localhost in dev, vercel.app in production, custom domain if added later. No env variable needed. No configuration. It just works.

## 5b. Auth Pages Are Separate Pages

Login and Register are TWO pages, never one page with a toggle.

- `/login` — Sign In only (email + password → sign in)
- `/register` — Create Account only (email + password + confirm password → sign up)
- Both pages link to each other via explicit navigation buttons
- No `isSignUp` state toggle. No in-place switching. No single-page combined form.

Why: Different UX. Register needs password confirmation, strength validation, success state with email instructions. Login is minimal — just get the user in. Combining them creates unnecessary state complexity and a worse experience for both flows.

## 5c. Query Intent over Literal Matching

Never answer a user's question literally if the premise is wrong. Always interpret intent.

```
User: "Why is BTC rising today?"
BTC is actually down 1.27% today.

❌ "BTC is not rising. It is down 1.27%."      ← Correct. Also useless.
✅ "Market Analysis: BTC is trading at $72,906, down 1.27%.
   The key narratives influencing BTC right now are..."  ← Answers what they MEANT.
```

Implementation: `lib/intent.ts` — rule-based. Detects "why + asset + direction" patterns, rewrites as market analysis, injects factCheckNote into prompt. Not AI. Just regex.

## 5d. Signal → Divergence → Attribution → Narrative → Memo (5-layer stack)

The product has five reasoning layers. Never collapse them. Never go straight from signals to LLM.

```
Layer 1: SIGNALS (lib/signals.ts)
  Atomic data points. Each has source + direction + delta + typicalStdDev.

Layer 2: DIVERGENCE DETECTION (lib/expectations.ts)
  7 signal pair expectations. Pure computation. Output: confirmed + diverged.

Layer 3: SEVERITY + ATTRIBUTION (lib/ranking.ts + lib/attribution.ts + lib/betas.ts)
  Severity: numeric 0-10 per divergence. Attribution: BTC move decomposition.

Layer 4: NARRATIVES (lib/narratives.ts)
  Hard gates. requiredSignals ALL present → Assessable. Otherwise → Not Assessable.

Layer 5: MEMO (lib/ai.ts → memo-renderer.tsx)
  LLM receives ALL of the above — not just signals. Divergence story leads the summary.
```

### CRITICAL: Signal ≠ Evidence

A signal can ONLY serve as evidence for a narrative if it appears in that narrative's requiredSignals or enhancingSignals.

```
❌ "BTC Price $72,802 → Institutional Buying"  ← BTC price is NOT evidence of institutional buying
✅ "BTC ETF Flow +$310M → Institutional Buying" ← ETF flow IS institutional buying evidence
```

### CRITICAL: All computation before LLM

Intent detection, divergence testing, severity scoring, move attribution — all in TypeScript. The LLM synthesizes findings, it does NOT detect them. Never ask the LLM "is there a divergence?" — compute it.

### CRITICAL: Lead with the story, not the checklist

The prompt rule is: "A divergence is more interesting than a confirmation." Never output "nothing significant" or "no narratives supported." There is always a story in the data relationships — find it.

## 5e. Scanner is the Home Page (V2+)

After login, users land on `/divergences` — not `/research`.

- `/divergences` — Scanner Dashboard. Auto-scans on load. Ranked anomalies.
- `/divergences/[pairId]` — Deep dive for one signal pair.
- `/research` — Still accessible via nav. Chat-style Q&A memo.

When adding a new page or feature, ask: "Does this belong on the scanner (proactive intelligence) or in the chat (deep-dive research)?"

## 5f. Severity Scoring is Numeric, Not Qualitative

Severity labels (Critical/Notable/Moderate/Minor) come from numeric scores — not the other way around.

```
Score formula: w_correlation × w_magnitude × penalty
  w_correlation: 3.0(strong) | 2.0(moderate) | 1.0(tentative)
  w_magnitude:   min(|delta_A/stdDev_A| + |delta_B/stdDev_B|, 5.0)
  penalty:       1.5(divergence) | 1.0(confirmation)
  Result clamped to [0, 10]

Labels: ≥7.0 Critical · ≥5.0 Notable · ≥3.0 Moderate · <3.0 Minor
```

Never change the severity label without recomputing the score. Label follows formula — formula does not follow label.

## 5g. Attribution Betas are Estimates, Not Precision

Beta coefficients in `lib/betas.ts` are practitioner estimates. They are labelled as such.

```
✅ "~80% of today's BTC move is unexplained by available macro signals"
❌ "The DXY-BTC beta is -2.500 with R²=0.83"
```

These are for the "explained vs unexplained" dichotomy — directionally useful, not statistically rigorous. Upgradable to rolling correlation when signal_history DB exists (V3).

## 5h. Resolution is Passive, No Background Jobs

Divergence resolution checking happens when the user opens the scanner. No cron, no worker, no Redis, no BullMQ.

- Load yesterday's persisted divergences from DB
- Compare to today's detection results
- Update resolution fields in-place
- Show resolved divergences in the scanner UI

This keeps the system fully serverless (Vercel-compatible).

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
