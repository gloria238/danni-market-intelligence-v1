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

## 5d. Signal → Narrative Architecture (V1.4 — HARD GATES)

The product has three layers. Never collapse them.

```
Layer 1: SIGNALS (lib/signals.ts)
  Atomic data points. Each has a source + DIRECTION (rising/falling/stable).
  Never show a raw number without directional context. "4.45%" is useless.
  "4.45% ▼ from 4.48% prior" is analysis-ready.

Layer 2: NARRATIVES (lib/narratives.ts)
  Each narrative defines:
    requiredSignals   — ALL must be present. Missing ANY → "Not Assessable"
    enhancingSignals  — nice-to-have. More = richer analysis.
    directionalLogic  — what signal pattern supports/contradicts the narrative

  HARD GATE: availableRequired.length === requiredSignals.length
    → true  → "Assessable" (LLM can reason about this)
    → false → "Not Assessable" (goes to UI as explanation, NOT to LLM)

Layer 3: MEMO (lib/ai.ts → memo-renderer.tsx)
  LLM only sees Assessable narratives. Not Assessable shown in separate section.
  Each indicator tagged with: signal direction (▲▼ —), isLive vs Est, narrative provenance.
```

### CRITICAL: Signal ≠ Evidence (V1.4+)

A signal can ONLY serve as evidence for a narrative if it appears in that
narrative's requiredSignals or enhancingSignals. Never cross-wire.

```
❌ "BTC Price $72,802 → Institutional Buying"  ← BTC price is NOT evidence of institutional buying
✅ "BTC ETF Flow +$310M → Institutional Buying" ← ETF flow IS institutional buying evidence
```

The LLM prompt and post-processing both enforce this. Indicators from a narrative
must match its signal set. The system filters mismatches in ai.ts.

When adding a new narrative:
1. Define the SIGNAL first (in SIGNAL_REGISTRY)
2. Wire the signal to a data source (market-data.ts)
3. THEN create the narrative referencing it
4. Ask: "Is this signal genuinely evidence for this narrative?" If not, don't add it.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

