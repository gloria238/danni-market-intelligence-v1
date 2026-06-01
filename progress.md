# Danni Research Terminal — Progress Log

> **Start date:** 2026-06-01 · **Status:** In active development

---

## Phase 0 — Product Definition (2026-06-01)

**Decision:** Not a quant platform. Not a trading terminal. A market cognition operating system.

**Core insight rejected:**
- ❌ "Market Intelligence = ChatGPT + market data"
- ✅ "Market Intelligence = structured financial knowledge + AI reasoning"

**V1 scope defined:**
- Single page: `/research`
- Single flow: question → structured memo
- No Dashboard, no RAG, no Multi-Agent, no WebSocket, no Redis

---

## Phase 1 — Zero-to-Working (2026-06-01)

**Commit:** `c83263b` — V1.1: Danni Research Terminal

**What was built:**
- Next.js 15 project initialized (App Router, TypeScript, Tailwind 4)
- Supabase project connected (`dannifinance` schema, `pynprilsdbvgxyyzjtif`)
- Database migration: `research_sessions` + `research_messages` tables with RLS
- `/` landing page — hero headline + feature pills + CTA
- `/login` — email/password auth via Supabase
- `/research` — chat UI with question input + message list
- `/api/research` — POST endpoint → DeepSeek → structured JSON
- `components/research/memo-renderer.tsx` — JSON → professional memo card
- `lib/ai.ts` — DeepSeek client with system prompt + `ResearchOutput` type
- `lib/supabase/middleware.ts` — session refresh + route protection
- Auth callback route for email confirmation

**Verification:** Build passes. API returns structured JSON with summary, narratives, evidence, risks, confidence_score.

---

## Phase 2 — Narrative Definition Layer + Context (2026-06-01)

**Commit:** `c83263b` (same commit, included)

**What was built:**
- `lib/narratives.ts` — 10 pre-defined narrative definitions, each with:
  - Unique ID, display name, description
  - Indicator list (4 per narrative)
  - Prompt context for the LLM
- `lib/market-data.ts` — Context Augmentation Layer (NOT RAG):
  - CoinGecko free API → BTC/ETH real-time price + 24h change
  - NewsAPI free tier → 8 latest headlines
  - 8-second timeout, graceful degradation
  - `formatMarketContextForPrompt()` — compact prompt block
- System prompt rewritten to:
  - Inject Narrative Registry into system prompt
  - Require narratives matched from registry (no free invention)
  - Inject real-time market context
  - Require per-narrative indicator evidence

**UI upgraded:**
- Each narrative card shows per-indicator evidence grid
- Bull/bear/neutral signal icons per indicator
- "Live data" badge when market context available
- Confidence bars on each narrative + overall

---

## Phase 3 — Premium Design System (2026-06-01)

**Commit:** `3475c5b` — V1.1.1: Premium dark theme

**What was built:**
- Design overhaul using `ui-ux-pro-max` reference data
- Color palette sourced from Financial Dashboard + Coding Bootcamp primitives:
  - Deep navy-black background (`oklch(0.12 0.02 260)`)
  - Trust blue accent (`oklch(0.58 0.22 265)`)
  - Conviction green indicators (`oklch(0.65 0.19 155)`)
- All colors migrated to `oklch` — perceptually uniform, no hardcoded hex
- 4-level surface depth: background → surface → surface-hover → surface-elevated
- Glass cards with multi-layer box-shadows (dimensional layering style)
- Custom scrollbar, text selection, focus ring — all themed
- `animate-in` keyframes (fade + slide-up) with `prefers-reduced-motion` respect
- shadcn/ui primitives migrated from default CSS vars to custom design tokens:
  - `components/ui/button.tsx` — accent blue, surface variants
  - `components/ui/input.tsx` — surface background, accent focus ring
  - `components/ui/textarea.tsx` — rounded-lg, surface bg
  - `components/ui/card.tsx` — glass-card spec

**Pages redesigned:**
- Landing: oversized headline, 3-feature bento grid, accent CTA with glow shadow
- Research: sticky frosted header, empty-state icon + examples, floating input with accent send button
- Memo: bento narrative cards with inner indicator grids, section icons, hover states

---

## Phase 4 — Auth UX + Email Redirect Fix (2026-06-01)

**Commit:** `fbad1ad` — V1.1.2: Separate auth pages

**What was built:**
- `/login` (Sign In) and `/register` (Create Account) split into separate pages
- Register page features:
  - Password confirmation with match validation
  - Real-time validation hints ("Passwords match" / "Must be at least 8 characters")
  - Password visibility toggle (Eye/EyeOff icons) on both password fields
  - Red border on mismatch, green on match
  - Success state with email instructions card (replaces `alert()`)
  - `NEXT_PUBLIC_SITE_URL` used for email redirect URL (not `window.location.origin`)
- Auth callback fixed: cookies set on `response` object before `exchangeCodeForSession`
- Middleware updated to redirect authenticated users away from both `/login` and `/register`

---

## Phase 5 — Font Loading Fix (2026-06-01)

**Commit:** `7a669f8` — V1.1.3: Font loading

**What was fixed:**
- Inter and JetBrains Mono now loaded via `next/font/google` with `display: swap`
- CSS variable chain: next/font sets `--font-inter` → globals.css sets `--font-sans: var(--font-inter), ...`
- Removed broken `border-radius: 2px` from global `*:focus-visible`
- Layout applies font CSS variables to `<html>` for full DOM tree coverage

---

## What V1 Explicitly Excludes

| Feature | Reason | When |
|---------|--------|------|
| Dashboard (TradingView, widgets) | Not core to memo value prop | V2 |
| RAG (embeddings, vector search) | Over-engineering before proving chat works | V2 |
| Multi-Agent orchestration | Latency + cost before proving single agent | V2 |
| Narrative Registry expansion (20→50) | 10 sufficient for MVP | V2 |
| News + market data persistence | In-memory context per request works | V2 |
| Redis / BullMQ | No async processing needed | V2 |
| FastAPI backend | Next.js API routes sufficient | V2 |
| OpenAI / Claude fallback | DeepSeek works end-to-end | V2 |
| Portfolio / Scenario Analysis | Separate product feature | V2+ |
| WebSocket real-time | CoinGecko polling sufficient | V2+ |
| Mobile app | Responsive web first | V3 |

---

## Current Status

- **4 commits** on `main`
- **32 source files**, ~2,100 lines (excluding node_modules, generated files)
- **9 routes** (landing, login, register, research, api/research, auth/callback, 404)
- **10 narratives** with indicator definitions
- **2 DB tables** with RLS
- **Build:** ✅ Clean TypeScript compilation, all pages static/dynamic as appropriate
- **API:** ✅ Returns structured JSON from DeepSeek with real-time market context
- **Auth:** ✅ Sign in, sign up, email confirmation, JWT, RLS — full loop
- **Design:** ✅ Premium dark theme, all design tokens oklch, fonts loaded via next/font
