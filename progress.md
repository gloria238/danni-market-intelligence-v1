# Danni Market Intelligence Terminal — Progress Log

> **Start date:** 2026-06-01 · **Current version:** V2.0 · **14 commits**

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

## What V2 Explicitly Excludes

| Feature | Reason | When |
|---------|--------|------|
| Dashboard (TradingView, price grids) | Not core to intelligence value prop | V3 |
| RAG (embeddings, vector search) | Context augmentation sufficient | V3 |
| Multi-Agent orchestration | Single agent + structured prompt works | V3 |
| Backtesting framework | Needs signal_history DB first | V3 |
| Alert notifications (email/push) | Premature without DAU | V3 |
| Portfolio tracker | Different product category | Never (V1) |
| Real-time WebSocket | Polling sufficient for research cadence | V3+ |
| Mobile app | Responsive web first | V4 |
| Redis / BullMQ / cron jobs | Serverless architecture, resolution is passive | Never (V1) |
| Custom narrative builder | Registry expands based on our data | V3 |

---

## Current Status (V2.0)

- **14 commits** on `main`
- **49 source files**, ~3,700 lines core logic
- **11 routes** (landing, login, register, divergences, divergences/[id], research, api/research, api/divergences, auth/callback, 404)
- **11 signals** across 4 data sources (CoinGecko, FRED, Farside, NewsAPI)
- **10 narratives** with required/enhancing signal split + directional logic
- **7 signal expectations** with correlation types + strength ratings
- **4 beta coefficients** for move attribution
- **3 DB tables** (sessions, messages, divergence_observations) with RLS
- **Build:** ✅ Clean TypeScript, all 11 routes static/dynamic as appropriate
- **API:** ✅ Question→Memo pipeline. Historical divergence data endpoint.
- **Auth:** ✅ Sign in, sign up, email confirmation, JWT, RLS.
- **Design:** ✅ Premium dark theme, oklch tokens, Inter + JetBrains Mono via next/font.
- **Scanner:** ✅ Auto-scan on load, ranked anomalies, attribution decomposition, deep-dive per pair.
