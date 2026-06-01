# Danni Market Intelligence Terminal — Architecture

> **V2 Mission:** Cross-signal divergence detection + structured market intelligence.
> The system discovers anomalies — the user investigates.

---

## System Overview

```
┌──────────────────────────────────┐
│          Next.js 15               │
│       (App Router, RSC)           │
├──────────────────────────────────┤
│  /                  Landing       │
│  /login             Sign In       │
│  /register          Create Account│
│  /divergences       Scanner (HOME)│
│  /divergences/[id]  Deep Dive     │
│  /research          Chat Memo     │
│  /api/research      Q → Memo      │
│  /api/divergences   History API   │
│  /auth/callback     OAuth         │
├──────────────────────────────────┤
│           Supabase                │
│  ├── Auth (email/password)        │
│  ├── PostgreSQL                   │
│  └── Schema: dannifinance         │
├──────────────────────────────────┤
│         DeepSeek API              │
│  └── deepseek-chat (JSON mode)    │
├──────────────────────────────────┤
│    External Data Sources          │
│  ├── CoinGecko (BTC/ETH/Gold)     │
│  ├── FRED (DXY, US10Y, US2Y, FF) │
│  ├── Farside (BTC ETF flows)      │
│  └── NewsAPI (headlines)          │
└──────────────────────────────────┘
```

---

## Reasoning Stack (5 Layers)

```
Layer 1: SIGNALS (lib/signals.ts)
  Atomic data points. 11 signals. Each has direction + delta + typicalStdDev.
  Sources: CoinGecko / FRED / Farside / NewsAPI.

Layer 2: DIVERGENCE DETECTION (lib/expectations.ts)
  7 signal pair expectations. Pure computation. Checks "expected vs actual."
  Returns confirmed + diverged pairs.

Layer 3: SEVERITY + ATTRIBUTION (lib/ranking.ts + lib/attribution.ts + lib/betas.ts)
  Severity: 0.0–10.0 per divergence (w_correlation × w_magnitude × penalty).
  Attribution: decompose BTC move into factor contributions from each signal.
  Betas: practitioner-estimated coefficients mapping signal deltas → BTC % moves.

Layer 4: NARRATIVES (lib/narratives.ts)
  10 narratives. Hard gates: ALL required signals present → Assessable. Otherwise → Not Assessable.
  Required vs enhancing signal split. Directional logic per narrative.

Layer 5: MEMO (lib/ai.ts → memo-renderer.tsx)
  LLM receives: cross-signal analysis + attribution + narrative framework + signal data.
  Output: structured memo with divergence story, ranked anomalies, move attribution.
```

---

## Directory Structure

```
.
├── app/
│   ├── page.tsx                           ← Landing (/)
│   ├── layout.tsx                         ← Root layout (fonts, Toaster)
│   ├── globals.css                        ← Design tokens (oklch), animations
│   ├── login/page.tsx                     ← Sign In
│   ├── register/page.tsx                  ← Create Account
│   ├── auth/callback/route.ts             ← Supabase email confirmation
│   ├── divergences/page.tsx               ← Scanner Dashboard (V2 HOME)
│   ├── divergences/[pairId]/page.tsx      ← Single-divergence deep dive
│   ├── research/page.tsx                  ← Research Chat (Q&A memo)
│   └── api/
│       ├── research/route.ts              ← POST: question → memo
│       └── divergences/route.ts           ← GET: historical divergence records
│
├── components/
│   ├── research/memo-renderer.tsx          ← Full memo renderer
│   ├── scanner/anomaly-card.tsx            ← Reusable divergence card
│   └── ui/                                ← shadcn/ui primitives (themed)
│
├── lib/
│   ├── signals.ts                         ← Signal Registry (11 signals + typicalStdDev)
│   ├── expectations.ts                    ← Expectation Registry (7 pairs) + divergence detector
│   ├── ranking.ts                         ← Severity scoring (0.0–10.0)
│   ├── betas.ts                           ← Beta coefficient registry
│   ├── attribution.ts                     ← BTC move decomposition
│   ├── narratives.ts                      ← Narrative Registry (10 narratives, hard gates)
│   ├── intent.ts                          ← Query intent normalization
│   ├── resolution.ts                      ← Passive resolution checker
│   ├── ai.ts                              ← DeepSeek client + ResearchOutput
│   ├── market-data.ts                     ← Unified data fetcher (CG/FRED/Farside/News)
│   ├── supabase/                          ← Client, server, middleware
│   ├── db/
│   │   ├── schema.sql                     ← 3 tables (sessions, messages, divergences)
│   │   ├── migrate.ts                     ← Migration runner
│   │   └── divergence-store.ts            ← CRUD for divergence_observations
│   └── utils.ts                           ← cn() helper
│
├── middleware.ts                           ← Edge: auth guard for /research, /divergences
├── next.config.ts
├── package.json
└── CLAUDE.md                              ← Development conventions
```

---

## Request Flow

### Scanner (V2 default)

```
User opens /divergences (after login)
        │
        ▼
┌─────────────────────┐
│  fetchAllMarketData()│  CoinGecko + FRED + Farside + NewsAPI (parallel, 8s timeout)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  detectDivergences() │  Test 7 signal pairs: DXY↔BTC, US10Y↔BTC, Gold↔DXY, etc.
│  (pure computation)  │  For each pair: correlation confirmed or diverged?
└──────┬──────────────┘
       │
       ├──────────────────────────────────────┐
       ▼                                      ▼
┌─────────────────┐                  ┌─────────────────┐
│ computeAttribution()│              │ rankObservations()│
│  Decompose BTC move │              │  Score 0.0–10.0  │
│  into factor parts  │              │  per divergence  │
│  explained vs unexplained           │  w_corr × w_mag  │
└──────┬──────────────┘              │  × penalty       │
       │                              └──────┬───────────┘
       │                                      │
       └──────────────┬───────────────────────┘
                      ▼
┌─────────────────────┐
│  DeepSeek API        │  System prompt: cross-signal analysis + attribution +
│  Prompt injected     │  narrative framework + signal data + instructions
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Scanner UI          │  Ranked anomaly cards (severity gated)
│  + Memo (if clicked) │  Attribution waterfall
│                      │  Confirmed relationships
│                      │  Not Assessable narratives
│                      │  Deep dive → full memo per divergence pair
└─────────────────────┘
```

### Chat Memo (V1 preserved)

```
User asks question on /research
        │
        ▼
Intent detection → same pipeline as above → full memo rendered
```

---

## Narrative Registry (10 definitions)

| # | ID | Required Signals | Enhancing |
|---|-----|-----------------|-----------|
| 1 | `ETF_FLOW` | BTC_ETF_FLOW | BTC_PRICE, BTC_24H_CHANGE |
| 2 | `RATE_CUT_EXPECTATIONS` | US2Y_YIELD, US10Y_YIELD, FED_FUNDS_RATE | DXY_INDEX, BTC_PRICE |
| 3 | `USD_WEAKNESS` | DXY_INDEX | GOLD_PRICE, BTC_PRICE, US10Y_YIELD |
| 4 | `MACRO_EASING` | FED_FUNDS_RATE, US10Y_YIELD, DXY_INDEX | GOLD_PRICE, US2Y_YIELD, BTC_PRICE |
| 5 | `INSTITUTIONAL_BUYING` | BTC_ETF_FLOW | BTC_PRICE, BTC_24H_CHANGE |
| 6 | `REGULATORY_RELIEF` | MARKET_NEWS | BTC_PRICE |
| 7 | `TECHNICAL_BREAKOUT` | BTC_PRICE, BTC_24H_CHANGE | — |
| 8 | `GEOPOLITICAL_SAFE_HAVEN` | GOLD_PRICE, DXY_INDEX | BTC_PRICE, MARKET_NEWS |
| 9 | `SHORT_SQUEEZE` | BTC_PRICE | BTC_24H_CHANGE |
| 10 | `RISK_ON_SENTIMENT` | DXY_INDEX, US10Y_YIELD, BTC_PRICE | — |

---

## Signal Registry (11 definitions, 4 sources)

| Signal | Source | typicalStdDev |
|--------|--------|---------------|
| BTC_PRICE | CoinGecko | $1,500 |
| BTC_24H_CHANGE | CoinGecko | 2.5% |
| ETH_PRICE | CoinGecko | $100 |
| GOLD_PRICE | CoinGecko (XAUT) | $25 |
| DXY_INDEX | FRED (DTWEXBGS) | 0.3 pts |
| US10Y_YIELD | FRED (DGS10) | 0.04% |
| US2Y_YIELD | FRED (DGS2) | 0.05% |
| FED_FUNDS_RATE | FRED (FEDFUNDS) | 0.0% |
| BTC_ETF_FLOW | Farside | $150M |
| MARKET_NEWS | NewsAPI | — |

---

## Expectation Registry (7 signal pairs)

| Pair | Correlation | Strength | Resolution Signal |
|------|-----------|----------|-------------------|
| DXY ↔ BTC | inverse | strong | BTC_ETF_FLOW |
| US10Y ↔ BTC | inverse | moderate | BTC_ETF_FLOW |
| Gold ↔ DXY | inverse | strong | — |
| ETF ↔ BTC | direct | moderate | — |
| US10Y ↔ DXY | direct | moderate | — |
| Gold ↔ BTC | direct | tentative | MARKET_NEWS |
| US2Y ↔ US10Y | inverse | strong | — |

---

## Severity Scoring Formula

```
severity = w_correlation × w_magnitude × penalty

w_correlation:  3.0 (strong) | 2.0 (moderate) | 1.0 (tentative)
w_magnitude:    min(|delta_A/stdDev_A| + |delta_B/stdDev_B|, 5.0)
penalty:        1.5 (divergence) | 1.0 (confirmation)

Score bounded [0, 10]:
  ≥7.0 → Critical
  ≥5.0 → Notable
  ≥3.0 → Moderate
  <3.0 → Minor
```

## Attribution Model

```
BTC_actual_move (24h change %)
  = Σ (signal_delta × beta)

Beta coefficients (practitioner estimates):
  DXY → BTC:  β = -2.5   (1 pt DXY ↓ → ~2.5% BTC ↑)
  US10Y → BTC: β = -0.6   (25bps cut → ~15% historically)
  ETF Flow → BTC: β = +0.3 ($100M inflow → ~0.3% price)
  Gold → BTC: β = +0.6     (weak positive correlation)

Unexplained = BTC_actual - Σ(contributions)
UnexplainedRatio = |unexplained| / max(|BTC_actual|, 0.01)
```

---

## Database (Supabase — `dannifinance` schema)

```
research_sessions
├── id, user_id, title, created_at

research_messages
├── id, session_id, role, content, created_at

divergence_observations (V2)
├── id, user_id, signal_pair_id, observed_date
├── severity_score, divergence_type
├── signal_a_id/value/delta, signal_b_id/value/delta
├── resolution_date, resolution_direction, resolution_note
├── unexplained_move_score
└── created_at
```

**Row-Level Security:** All tables have user-scoped RLS policies.

---

## Auth Flow

```
1. Unauthenticated → middleware → /login
2. Sign In: email/password → Supabase auth → JWT → /divergences (scanner home)
3. Sign Up: email/password → confirmation email (window.location.origin/auth/callback) → /divergences
4. Session refresh: middleware.ts on every request

Protected routes: /research, /divergences, /api/divergences
```

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 (App Router) | Server Components, streaming, Vercel-native |
| Language | TypeScript 5.9 | Full-stack type safety |
| Styling | Tailwind CSS 4 + oklch | Perceptually uniform colors, dark mode native |
| UI | shadcn/ui (New York) + lucide-react | Accessible, themed primitives |
| Auth | Supabase Auth | Email/password, JWT cookies, RLS |
| Database | Supabase PostgreSQL | Managed, free tier, pgvector-ready |
| AI | DeepSeek (`deepseek-chat`) | 1/10 GPT-4 cost, JSON mode |
| Deployment | Vercel | Zero-config Next.js hosting |

**V2 still excludes:** Redis, BullMQ, FastAPI, Docker, pgvector, Multi-Agent, WebSocket, cron jobs, background workers.

---

## API Reference

### `POST /api/research`
Question → full memo pipeline (intent → signals → divergence → attribution → narratives → LLM → memo).

### `GET /api/divergences?pair=DXY_BTC&from=2026-05-01&to=2026-06-01`
Historical divergence records. Auth-gated. Supports date range and signal pair filtering.

### `GET /auth/callback`
Supabase email confirmation. Exchanges code for JWT, redirects to `/divergences`.

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Settings → API (anon key) |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek Platform → API Keys |
| `FRED_API_KEY` | Recommended | fred.stlouisfed.org (free) |
| `NEWSAPI_KEY` | Optional | newsapi.org (free tier, 100/day) |
| `DIRECT_URL` | Dev only | Supabase → Direct connection |
| `DATABASE_URL` | Yes | Supabase → Transaction pooler |

---

## Key Design Decisions

1. **Divergence-first, not narrative-first.** The most interesting finding is often a contradiction, not a confirmation. The scanner leads with anomalies.

2. **Pure computation before LLM.** Intent detection, divergence testing, severity scoring, and move attribution all happen in TypeScript — before the LLM ever sees the prompt. The LLM synthesizes, not detects.

3. **Hard gates on narrative activation.** Missing any required signal → "Not Assessable." No partial coverage. No "trust me bro."

4. **Passive resolution, no background jobs.** Divergence history is checked when users open the scanner. No cron, no worker, no Redis. Full serverless compatibility.

5. **Signal ≠ Evidence.** BTC price is not evidence of institutional buying. Each narrative's indicator set is constrained to its defined signals. Cross-wiring is blocked in both the prompt and post-processing.

6. **Practitioner betas, not ML.** Attribution coefficients are hardcoded estimates, labeled as such. They make the "explained vs unexplained" dichotomy useful without pretending to be precise.
