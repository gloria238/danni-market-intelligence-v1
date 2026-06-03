# Danni Market Intelligence Terminal — Progress Log

> **Start date:** 2026-06-01 · **Current version:** V3.5 · **20+ commits**

---

## Phase 0 — Product Definition (2026-06-01)

**Decision:** Not a quant platform. Not a trading terminal. A market cognition operating system.

**Core insight rejected:**
- ❌ "Market Intelligence = ChatGPT + market data"
- ✅ "Market Intelligence = structured financial knowledge + AI reasoning"

**V1 scope defined:** Single page `/research`. Single flow: question → memo. No Dashboard, RAG, Multi-Agent, WebSocket, Redis.

---

## Phase 1 — Zero-to-Working (2026-06-01)

**Commit:** `c83263b`

**Built:** Next.js 15, Supabase (`dannifinance` schema), DB migration (2 tables + RLS), `/` landing, `/login` auth, `/research` chat UI, `/api/research` POST endpoint, `memo-renderer.tsx`, DeepSeek client, middleware session refresh. Build passes. API returns structured JSON.

---

## Phase 2 — Narrative Definition Layer + Context (2026-06-01)

**Commit:** `c83263b` (same)

**Built:** `lib/narratives.ts` (10 pre-defined narratives with indicators + prompt context), `lib/market-data.ts` (CoinGecko + NewsAPI context layer, NOT RAG), system prompt rewritten to inject narrative registry + market context. UI: per-indicator evidence grids, bull/bear/neutral icons, "Live data" badge.

---

## Phase 3 — Premium Design System (2026-06-01)

**Commit:** `3475c5b`

**Built:** Design overhaul using `ui-ux-pro-max`. oklch-based color tokens (Financial Dashboard + Coding Bootcamp primitives). Deep navy-black bg, trust blue accent, conviction green indicators. 4-level surface depth. Glass cards with multi-layer shadows. shadcn/ui primitives migrated to custom tokens. Landing/research/memo pages redesigned.

---

## Phase 4 — Auth UX + Email Redirect Fix (2026-06-01)

**Commit:** `fbad1ad`

**Built:** `/login` and `/register` split into separate pages. Register: password confirmation, validation hints, visibility toggle, success state. Email redirect via `window.location.origin`. Auth callback fixed.

---

## Phase 5 — Font Loading Fix (2026-06-01)

**Commit:** `7a669f8`

**Fixed:** Inter + JetBrains Mono via `next/font/google` with `display: swap`. CSS variable chain properly connected. Removed broken `border-radius:2px` on global `*:focus-visible`.

---

## Phase 6 — Product Quality: Intent, Activation, Qualitative Confidence (2026-06-01)

**Commit:** `a3e959c` — V1.2

**Built:**
- `lib/intent.ts` — Query Intent Layer. Rule-based normalization. Detects "why + asset + direction" patterns. Rewrites as market analysis when premise contradicts facts.
- Narrative activation conditions — narratives only appear when required data sources are available. Suppressed narratives shown in "Data-Limited Narratives" UI section.
- Qualitative confidence (High/Medium/Low) replaces fake percentages. No more "65%" when the system can't explain why 65.

---

## Phase 7 — Signal-Coverage Architecture (2026-06-01)

**Commits:** `04f19f6` (V1.3), `44f8b19` (gold fix)

**Built:**
- Signal Registry: 11 atomic signals with sources + direction from multi-point context
- Data Source Layer: CoinGecko + FRED (DXY, US10Y, US2Y, Fed Funds) + Farside (ETF flow) + NewsAPI. All parallel, 8s timeout, graceful degradation.
- Narrative Registry rewritten with required/enhancing signal split. Coverage computed from signal availability.
- Gold source fixed: CoinGecko tether-gold (XAUT), not FRED (FRED gold series doesn't exist). FRED DXY and US10Y verified working.

---

## Phase 8 — Signal Taxonomy: Hard Gates + Directional Logic (2026-06-01)

**Commit:** `3aa29c7` — V1.4

**Built:**
- Hard gates: ALL required signals present → "Assessable". Missing ANY → "Not Assessable". Binary, no sliding scale.
- Signal ≠ Evidence enforced. BTC price is NOT evidence of institutional buying. Each narrative's indicators constrained to its signal set.
- Directional data pipeline: FRED fetches 30 observations, derives direction from two most recent numeric. CoinGecko uses 24h_change for direction. Farside compares today vs yesterday.
- Direction tags per indicator: ▲▼—. Live/Est provenance. Assessable badge replaces old confidence labels.

---

## Phase 9 — Divergence Engine (2026-06-01)

**Commit:** `6fcbf84` — V1.5

**Built:** `lib/expectations.ts` — 7 signal pair expectations (DXY↔BTC, US10Y↔BTC, Gold↔DXY, ETF↔BTC, US10Y↔DXY, Gold↔BTC, US2Y↔US10Y). Pure computation divergence detector. Cross-signal summary synthesizer. LLM prompt leads with divergence story. UI: Cross-Signal Analysis section with severity-graded divergence cards, confirmed relationships, directional assessment arrows.

---

## Phase 10 — Severity Scoring + Attribution + Resolution + Scanner (2026-06-01)

**Commit:** `c14bea3` — V2.0

**Built:**

**V1.6 — Numeric severity + attribution:**
- `lib/betas.ts` — 4 beta coefficients (DXY→BTC -2.5, US10Y→BTC -0.6, ETF→BTC +0.3, Gold→BTC +0.6)
- `lib/ranking.ts` — Severity scoring 0.0–10.0: w_correlation × w_magnitude × penalty
- `lib/attribution.ts` — BTC move decomposition into factor contributions. Explained% vs unexplained%. Ratio flags when >80% of move is unexplained.
- `lib/signals.ts` — SignalValue gains `delta` + `previousValue`. SignalDef gains `typicalStdDev`.
- `lib/market-data.ts` — Delta/previousValue populated from all sources.

**V1.7 — Divergence history + resolution:**
- `lib/db/schema.sql` — New `divergence_observations` table (14 columns, indexed, RLS)
- `lib/db/divergence-store.ts` — CRUD, date-range queries, resolution stats per pair
- `lib/resolution.ts` — Passive resolution checker. Compares yesterday's persisted divergences to today's data. Classifies: realigned_bullish, realigned_bearish, persisted, faded.
- `app/api/divergences/route.ts` — GET historical records with pair/date filtering

**V2 — Divergence Scanner:**
- `app/divergences/page.tsx` — Scanner dashboard. Auto-scans on load. Ranked anomalies, confirmed relationships, attribution summary, not-assessable list. New post-login home.
- `app/divergences/[pairId]/page.tsx` — Single-divergence deep dive with full memo.
- `components/scanner/anomaly-card.tsx` — Reusable card: severity gauge, directional summary, unexplained move badge, resolution signal hint.
- Middleware: `/divergences` protected. Post-login redirect → `/divergences` (scanner is home).
- Landing CTA → "Open Scanner" → `/divergences`.

---

## Phase 11 — Historical Memory + Pattern Matching (2026-06-03)

**Commits:** `2f43233`, `8de9d79`, `d1ed152`, `2202467`, `55496bf`, `c89fd05` — V3

**Built:**

**V3.1 — Signal History Engine:**
- `lib/db/schema.sql` — New `signal_history` table (UNIQUE on signal_id + recorded_at, RLS: public read, service_role write)
- `lib/db/signal-history-store.ts` — insertBatchSnapshots, getSignalHistory, getDailySnapshot, getMatchingDays
- `app/api/cron/signals/route.ts` — Vercel Cron endpoint (daily midnight, CRON_SECRET protected)
- `vercel.json` — Cron schedule
- `lib/supabase/server.ts` — createServiceSupabase() for service_role operations
- Signal history recorded fire-and-forget when users open scanner, or via cron

**V3.2 — Pattern Matching Engine:**
- `lib/patterns.ts` — matchHistoricalPattern, getPairHistoricalStats, getAllPairStats, matchCurrentDivergences
- Queries signal_history to answer "when DXY↓ and BTC↓ happened, what followed?"
- Returns: occurrences, bullishResolution%, bearishResolution%, avgBtcMove, medianResolutionDays
- Every number traceable to row counts. No normalization. No composite scores.

**V3.3 — Divergence Library:**
- `app/patterns/page.tsx` — Browsable historical pair database. Most Bullish · Most Bearish · All Pairs.
- `app/api/patterns/route.ts` — Pattern query API (auth-gated)
- Each pair: occurrences, resolution bars, avg duration, deep dive link

**Data source debugging:**
- FRED requests serialized (parallel → sequential) to avoid Vercel IP rate-limiting
- FRED timeout bumped 8s→15s for individual requests
- Farside marked as permanently down (Cloudflare bot protection)
- Diagnostic logging added for all data source failures

---

## Phase 12 — Research Health + Evidence Engine (2026-06-03)

**Commits:** included in V3 batch — V4 + V5

**Built:**

**V4 Lite — Research Health:**
- `lib/confidence.ts` — assessResearchHealth → coverage%, freshness%, sourceHealth%
- Three dimensions, three progress bars. No composite score. No traffic light.
- Coverage: available/total signals. Freshness: <24h / >48h stale. Source Health: ok/failed.

**V5 Lite — Evidence Engine:**
- `lib/evidence.ts` — Rule-based explanation templates (6 templates)
- Strength rules: Strong (≥3 supporting + 0 contradicting), Moderate (≥2 supporting), Weak (else)
- Each explanation has supportingEvidence[] + contradictingEvidence[]
- LLM writes rationale text only — never invents or ranks explanations
- Templates: ETF Outflow, Macro Tailwind Ignored, Risk-Off Rotation, Forced Liquidation, Regulatory Overhang, Unexplained

---

## Phase 13 — Research Timeline (2026-06-03)

**Commit:** included in V3 batch — V5.5

**Built:**
- `lib/timeline.ts` — Stitches signal_history + divergence_observations into chronological events
- `app/timeline/page.tsx` — Vertical timeline visualization with color-coded markers
- Event types: signal_move (green/red), divergence (amber), resolution (green/red/gray)
- Date range picker + signal pair quick filter chips
- `app/api/timeline/route.ts` — Timeline API (auth-gated)

---

## Phase 14 — i18n + Security Hardening (2026-06-03)

**Commits:** `950448c`, `1e7eed9` — V3.5

**Built:**

**i18n:**
- `lib/i18n.tsx` — LocaleProvider + useLocale hook. 80+ keys per language. localStorage persistence.
- `components/locale-toggle.tsx` — Globe icon toggle in header (EN ↔ 中文)
- `components/client-providers.tsx` — Client wrapper for server layout
- All pages updated: scanner, deep dive, patterns, timeline, anomaly card, evidence badge
- SSR-safe: useLocale returns English fallback during build
- Narrative names, signal labels, severity levels, evidence labels all translated

**Security fixes:**
- `/api/research` now auth-gated (was missing — could burn DeepSeek credits)
- Middleware protects `/patterns`, `/timeline`, `/api/patterns`, `/api/timeline`, `/api/research`
- API routes return 401 JSON, page routes redirect to `/login`
- `signal_history` RLS: public read + service_role write with explicit policies
- Signal history reads use anon key (works without SUPABASE_SERVICE_ROLE_KEY on Vercel)

---

## What V3.5 Explicitly Excludes

| Feature | Reason | When |
|---------|--------|------|
| Forecast Engine | Needs 90+ days signal_history | V6 |
| Evidence Graph (DAG) | Needs V5 stable first | V5.5 |
| Market Regime classification | Not enough data to justify | V4+ |
| Multi-Asset expansion (SPX/Oil/SOL) | Scope control | V4+ |
| Dashboard (TradingView, price grids) | Not core to intelligence value prop | Never |
| RAG (embeddings, vector search) | Context augmentation sufficient | Never |
| Multi-Agent orchestration | Single agent + structured prompt works | Never |
| Alert notifications (email/push) | Premature without DAU | V6+ |
| Portfolio tracker | Different product category | Never |
| Real-time WebSocket | Polling sufficient for research cadence | Never |
| Mobile app | Responsive web first | V6+ |
| Redis / BullMQ / cron jobs (for divergence) | Serverless, resolution is passive | Never |
| Custom narrative builder | Registry expands based on our data | V6+ |

---

## Current Status (V3.5)

- **20+ commits** on `main`
- **60+ source files**, ~5,500 lines core logic
- **14 routes** (landing, login, register, divergences, divergences/[id], patterns, timeline, research, api/research, api/divergences, api/patterns, api/timeline, api/cron/signals, auth/callback)
- **11 signals** across 4 data sources (CoinGecko, FRED, Farside [down], NewsAPI)
- **10 narratives** with required/enhancing signal split + directional logic
- **7 signal expectations** with correlation types + strength ratings
- **4 beta coefficients** for move attribution
- **4 DB tables** (sessions, messages, divergence_observations, signal_history) with RLS
- **6 evidence templates** with rule-based strength scoring
- **80+ i18n keys** in English + 简体中文
- **Build:** ✅ Clean TypeScript, all 14 routes static/dynamic as appropriate
- **API:** ✅ Full reasoning pipeline. Pattern matching API. Timeline API. Cron endpoint.
- **Auth:** ✅ Sign in, sign up, email confirmation, JWT, RLS. All API routes auth-gated.
- **Design:** ✅ Premium dark theme, oklch tokens, Inter + JetBrains Mono via next/font. Language toggle.
- **Scanner:** ✅ Auto-scan on load, ranked anomalies, historical outcomes, evidence badges, research health.
- **Patterns:** ✅ Browsable pair database with resolution rates and avg durations.
- **Timeline:** ✅ Chronological event feed with signal pair filtering.
