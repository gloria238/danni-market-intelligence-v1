# Danni Market Intelligence Terminal — Architecture

> **V3.5 Mission:** Historical pattern matching + evidence-based explanation.
> The system discovers anomalies, finds historical precedent, ranks evidence, and builds a research timeline.

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
│  /patterns          Divergence Lib│
│  /timeline          Research View │
│  /research          Chat Memo     │
│  /api/research      Q → Memo      │
│  /api/divergences   History API   │
│  /api/patterns      Pattern API   │
│  /api/timeline      Timeline API  │
│  /api/cron/signals  Daily Cron    │
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
│  ├── Farside (BTC ETF) [DOWN]    │
│  └── NewsAPI (headlines)          │
└──────────────────────────────────┘
```

---

## Reasoning Stack (8 Layers)

```
SIGNALS (lib/signals.ts)
    ↓
DIVERGENCE DETECTION (lib/expectations.ts)
    ↓
SEVERITY + ATTRIBUTION (lib/ranking.ts + lib/attribution.ts + lib/betas.ts)
    ↓
HISTORICAL MEMORY (lib/db/signal-history-store.ts)        ← V3
    ↓
PATTERN MATCHING (lib/patterns.ts)                        ← V3
    ↓
RESEARCH HEALTH (lib/confidence.ts)                       ← V4
    ↓
EVIDENCE ENGINE (lib/evidence.ts)                         ← V5
    ↓
NARRATIVES (lib/narratives.ts)
    ↓
LLM MEMO (lib/ai.ts → memo-renderer.tsx)
```

**Every layer before the LLM is pure TypeScript.** The LLM synthesizes, explains, and writes — but never detects, ranks, or scores.

---

## Directory Structure

```
.
├── app/
│   ├── page.tsx                           ← Landing (/)
│   ├── layout.tsx                         ← Root layout + ClientProviders + Toaster
│   ├── globals.css                        ← Design tokens (oklch), animations
│   ├── login/page.tsx                     ← Sign In
│   ├── register/page.tsx                  ← Create Account
│   ├── auth/callback/route.ts             ← Supabase email confirmation
│   ├── divergences/page.tsx               ← Scanner Dashboard (HOME, V2+)
│   ├── divergences/[pairId]/page.tsx      ← Single-divergence deep dive
│   ├── patterns/page.tsx                  ← Divergence Library (V3)
│   ├── timeline/page.tsx                  ← Research Timeline (V5.5)
│   ├── research/page.tsx                  ← Research Chat (Q&A memo)
│   └── api/
│       ├── research/route.ts              ← POST: question → memo (full pipeline)
│       ├── divergences/route.ts           ← GET: historical divergence records
│       ├── patterns/route.ts              ← GET: pattern match results (V3)
│       ├── timeline/route.ts              ← GET: chronological events (V5.5)
│       └── cron/signals/route.ts          ← GET: daily signal snapshot (V3)
│
├── components/
│   ├── client-providers.tsx               ← LocaleProvider wrapper
│   ├── locale-toggle.tsx                  ← EN/中文 toggle
│   ├── research/memo-renderer.tsx          ← Full memo renderer
│   ├── scanner/anomaly-card.tsx            ← Reusable divergence card (V2+)
│   └── ui/                                ← shadcn/ui primitives (themed)
│
├── lib/
│   ├── signals.ts                         ← Signal Registry (11 signals + typicalStdDev)
│   ├── expectations.ts                    ← Expectation Registry (7 pairs) + divergence detector
│   ├── ranking.ts                         ← Severity scoring (0.0–10.0)
│   ├── betas.ts                           ← Beta coefficient registry
│   ├── attribution.ts                     ← BTC move decomposition
│   ├── narratives.ts                      ← Narrative Registry (10 narratives, hard gates)
│   ├── patterns.ts                        ← Pattern matching engine (V3)
│   ├── confidence.ts                      ← Research Health (V4)
│   ├── evidence.ts                        ← Evidence Engine (V5)
│   ├── timeline.ts                        ← Research Timeline query (V5.5)
│   ├── i18n.tsx                           ← LocaleProvider + translation dictionaries (50+ keys)
│   ├── intent.ts                          ← Query intent normalization
│   ├── resolution.ts                      ← Passive resolution checker
│   ├── ai.ts                              ← DeepSeek client + ResearchOutput
│   ├── market-data.ts                     ← Unified data fetcher (CG/FRED/Farside/News)
│   ├── supabase/                          ← Client, server, middleware
│   ├── db/
│   │   ├── schema.sql                     ← 4 tables (sessions, messages, divergences, signal_history)
│   │   ├── migrate.ts                     ← Migration runner
│   │   ├── divergence-store.ts            ← CRUD for divergence_observations
│   │   └── signal-history-store.ts        ← CRUD for signal_history (V3)
│   └── utils.ts                           ← cn() helper
│
├── middleware.ts                           ← Edge: auth guard for all protected routes + API
├── vercel.json                            ← Cron config (V3)
├── next.config.ts
├── package.json
└── CLAUDE.md                              ← Development conventions
```

---

## Request Flow

### Scanner (default landing)

```
User opens /divergences (after login)
        │
        ▼
┌─────────────────────┐
│  fetchAllMarketData()│  CoinGecko + FRED + NewsAPI (parallel, 15s FRED timeout)
└──────┬──────────────┘
       │
       ├── insertBatchSnapshots() → signal_history (fire-and-forget)
       │
       ▼
┌─────────────────────┐
│  detectDivergences() │  Test 7 signal pairs
│  (pure computation)  │
└──────┬──────────────┘
       │
       ├──────────────────────────────────────┐
       ▼                                      ▼
┌─────────────────┐                  ┌─────────────────┐
│ computeAttribution()│              │ rankObservations()│
└──────┬──────────────┘              └──────┬───────────┘
       │                                      │
       ▼                                      ▼
┌─────────────────────┐            ┌─────────────────────┐
│ matchCurrentDivergences()│      │ assessResearchHealth()│
│ Pattern matching (V3)  │        │ Coverage·Freshness·  │
└──────┬──────────────┘            │ Source Health (V4)   │
       │                            └──────┬──────────────┘
       ▼                                      │
┌─────────────────────┐                      │
│ generateEvidence()   │  Evidence Engine (V5)│
└──────┬──────────────┘                      │
       │                                      │
       └──────────────┬───────────────────────┘
                      ▼
┌─────────────────────┐
│  DeepSeek API        │  System prompt: attribution + divergence + patterns +
│  Prompt injected     │  evidence + health + narratives + signals
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Scanner UI          │  Ranked anomaly cards (severity + historical bar + evidence)
│  + Deep Dive         │  Research Health bars
│  + Patterns Library  │  Historical outcome stats
│  + Timeline          │  Chronological event chain
│  + Memo              │  Full structured analysis
└─────────────────────┘
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

## Signal Registry (11 definitions)

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
| BTC_ETF_FLOW | Farside [DOWN] | $150M |
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
  ≥7.0 → Critical / 危急
  ≥5.0 → Notable / 显著
  ≥3.0 → Moderate / 中等
  <3.0 → Minor / 轻微
```

---

## V3.5 New Layers

### Historical Memory (V3) — `lib/db/signal-history-store.ts`

Daily signal snapshots stored in `signal_history`. Populated by Vercel Cron (`/api/cron/signals`, 0 0 * * *) or passively when users open the scanner.

Schema:
```sql
signal_history (id, signal_id, value, delta, source, recorded_at)
UNIQUE(signal_id, recorded_at)
```

Signal prices are public data — RLS allows public SELECT, service_role INSERT.

### Pattern Matching (V3) — `lib/patterns.ts`

Answers: "When DXY↓ and BTC↓ occurred in the past, what happened next?"

```
matchHistoricalPattern(pairId, dirA, dirB) → PatternMatchResult
  occurrences: 42
  bullishResolution: 69%
  bearishResolution: 21%
  neutralResolution: 10%
  avgBtcMove: +2.1%
  medianResolutionDays: 3
```

Every number traceable to row counts in signal_history. No normalization. No composite scores.

### Research Health (V4 Lite) — `lib/confidence.ts`

Three independent dimensions, three progress bars. No composite score. No traffic light.

```
Coverage        8/11  82%      ████████░░
Freshness       10/11 91%      █████████░
Source Health   4/4   100%     ██████████
```

### Evidence Engine (V5 Lite) — `lib/evidence.ts`

Rule engine — not ML, not probability, not prediction. Evidence aggregation.

Strength rules (pure counting):
```
Strong   = ≥3 supporting AND 0 contradicting
Moderate = ≥2 supporting
Weak     = everything else
```

Six explanation templates activated by specific signal conditions (ETF Outflow, Macro Tailwind Ignored, Risk-Off Rotation, Forced Liquidation, Regulatory Overhang, Unexplained). LLM writes rationale text only — ranking is deterministic.

### Research Timeline (V5.5) — `lib/timeline.ts`

Stitches signal_history + divergence_observations into chronological event feed:

```
Jun 1 · Signal · ETF Flow ↓ −$200M
Jun 2 · Divergence · DXY vs BTC · Notable 5.2
Jun 4 · Signal · DXY ↑ +1.2%
Jun 6 · Resolution · DXY vs BTC — Resolved Bullish
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

signal_history (V3)
├── id, signal_id, value, delta, source, recorded_at
└── UNIQUE(signal_id, recorded_at)
```

**RLS:** User-scoped for sessions, messages, divergences. Public read for signal_history. Service role write for signal_history.

---

## Auth Flow

```
1. Unauthenticated → middleware → /login
2. Sign In: email/password → Supabase auth → JWT → /divergences (scanner home)
3. Sign Up: email/password → confirmation email (window.location.origin/auth/callback) → /divergences
4. Session refresh: middleware.ts on every request

Protected routes: /research, /divergences, /patterns, /timeline, /api/*
API routes return 401 JSON. Page routes redirect to /login.
```

---

## i18n (V3.5)

`lib/i18n.tsx` — LocaleProvider + useLocale hook. Two dictionaries (en/zh), 50+ UI keys per language. Persisted to localStorage. SSR-safe fallback to English. Toggle via `components/locale-toggle.tsx` (Globe icon in header).

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
| Cron | Vercel Cron | Daily signal_history snapshot |
| Deployment | Vercel | Zero-config Next.js hosting |

**V3.5 still excludes:** Redis, BullMQ, FastAPI, Docker, pgvector, Multi-Agent, WebSocket, background workers, forecast engine.

---

## API Reference

### `POST /api/research`
Full pipeline: intent → signals → divergence → attribution → patterns → health → evidence → LLM → memo. Auth-gated.

### `GET /api/divergences?pair=DXY_BTC&from=2026-05-01&to=2026-06-01`
Historical divergence records. Auth-gated.

### `GET /api/patterns?pair=DXY_BTC` / `GET /api/patterns?all=true`
Pattern match results or all pair stats. Auth-gated.

### `GET /api/timeline?from=2026-05-01&to=2026-06-01&pair=DXY_BTC`
Chronological event feed. Auth-gated.

### `GET /api/cron/signals`
Vercel Cron endpoint. Protected by CRON_SECRET. Fetches all market data and inserts into signal_history.

### `GET /auth/callback`
Supabase email confirmation. Exchanges code for JWT, redirects to `/divergences`.

---

## Key Design Decisions

1. **LLM is the last layer.** Divergence detection, severity scoring, pattern matching, health assessment, evidence ranking — all TypeScript. The LLM only synthesizes.

2. **Every number is traceable.** "69% bullish" = "69 of 100 matching days saw BTC higher at T+3." No black-box normalization.

3. **Evidence, not prediction.** Evidence Engine uses counting rules (≥3 supporting = Strong), not probability. Explainable in one sentence.

4. **Passive + Cron hybrid.** Divergence resolution is passive (user-scoped). Signal history uses Vercel Cron (public data). Both serverless-compatible.

5. **Hard gates on narrative activation.** Missing any required signal → "Not Assessable." No partial coverage.

6. **Practitioner betas, not ML.** Attribution coefficients are hardcoded estimates, labeled as such. Upgradable to rolling correlation when signal_history accumulates enough data (V6).

---

*Last updated: 2026-06-03 — V3.5*
