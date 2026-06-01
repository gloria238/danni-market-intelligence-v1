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

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

