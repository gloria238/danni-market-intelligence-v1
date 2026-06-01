# Danni Research Terminal — Architecture

> **V1 Mission:** Ask any market question. Get a structured investment memo.

---

## System Overview

```
┌──────────────────────────┐
│       Next.js 15          │
│    (App Router, RSC)      │
├──────────────────────────┤
│  /                        │  Landing page
│  /login                   │  Sign In
│  /register                │  Create Account
│  /research                │  Research Chat (auth-gated)
│  /api/research            │  POST → DeepSeek → Structured JSON
│  /auth/callback           │  Supabase email confirmation
├──────────────────────────┤
│      Supabase             │
│  ├── Auth (email/pass)    │
│  ├── PostgreSQL           │
│  └── Schema: dannifinance │
├──────────────────────────┤
│      DeepSeek API         │
│  └── deepseek-chat        │
│      response_format:json │
└──────────────────────────┘
```

---

## Directory Structure

```
.
├── app/
│   ├── page.tsx                        ← Landing (/)
│   ├── layout.tsx                      ← Root layout (fonts, Toaster)
│   ├── globals.css                     ← Design tokens (oklch), animations
│   ├── login/page.tsx                  ← Sign In page
│   ├── register/page.tsx               ← Create Account page
│   ├── auth/callback/route.ts          ← Supabase OAuth callback
│   ├── research/page.tsx               ← Research chat UI (auth-gated)
│   └── api/research/route.ts           ← POST endpoint: question → memo
│
├── components/
│   ├── research/memo-renderer.tsx       ← Structured memo → professional UI
│   └── ui/                             ← shadcn/ui primitives (themed)
│
├── lib/
│   ├── ai.ts                           ← DeepSeek client + ResearchOutput type
│   ├── narratives.ts                   ← Narrative Registry (10 definitions)
│   ├── market-data.ts                  ← CoinGecko + NewsAPI context layer
│   ├── supabase/client.ts              ← Browser Supabase client
│   ├── supabase/server.ts              ← Server Supabase client
│   ├── supabase/middleware.ts           ← Session refresh + route protection
│   └── utils.ts                        ← cn() classname helper
│
├── middleware.ts                        ← Edge: auth guard, redirect logic
├── next.config.ts                      ← Next.js config
├── tsconfig.json
├── package.json
└── CLAUDE.md                           ← Development conventions
```

---

## Request Flow: Question → Memo

```
User types "Why is BTC rising?"
        │
        ▼
┌──────────────────┐
│  POST /api/research  │  { question: "..." }
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Fetch Context    │
│  ├── CoinGecko   │  BTC/ETH price (free, no key)
│  └── NewsAPI     │  8 latest headlines (free tier)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Build Prompt     │
│  ├── System prompt (analyst persona)
│  ├── Narrative Registry (10 pre-defined)
│  ├── Market data snapshot
│  └── News headlines
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  DeepSeek API     │
│  model: deepseek-chat
│  response_format: json_object
│  temperature: 0.5
│  max_tokens: 2500
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Validate Output  │
│  ├── Resolve narratives against registry
│  ├── Sanitize confidence scores (0-100)
│  └── Fill missing fields
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  MemoRenderer UI  │
│  ├── Executive Summary
│  ├── Narrative cards (bento grid)
│  │   ├── Confidence gauge
│  │   ├── Indicator evidence (bull/bear/neutral)
│  │   └── Reasoning text
│  ├── Supporting Evidence
│  ├── Risk Factors
│  └── Overall Confidence bar
└──────────────────┘
```

---

## Narrative Registry (V1.1)

The product's knowledge base. The LLM **matches** from this registry — it does **not** invent narratives.

| # | ID | Name | Key Indicators |
|---|-----|------|----------------|
| 1 | `ETF_FLOW` | ETF Flows | BTC ETF Net Flow, ETH ETF Net Flow, ETF Volume, IBIT/FBTC Flow |
| 2 | `RATE_CUT_EXPECTATIONS` | Rate Cut Expectations | FedWatch, US10Y Yield, DXY, Fed Funds Futures |
| 3 | `USD_WEAKNESS` | USD Weakness | DXY, EUR/USD, CNY/USD, Gold Price |
| 4 | `RISK_ON_SENTIMENT` | Risk-On Sentiment | SPX, NASDAQ, VIX, Fear & Greed Index |
| 5 | `SHORT_SQUEEZE` | Short Squeeze | Funding Rate, Open Interest, Liquidations (Short), Basis |
| 6 | `INSTITUTIONAL_BUYING` | Institutional Buying | CME OI, ETF Flow, Coinbase Premium, OTC Volume |
| 7 | `REGULATORY_RELIEF` | Regulatory Relief | SEC Updates, Legislation Progress, Court Rulings |
| 8 | `MACRO_EASING` | Macro Easing | Fed Balance Sheet, Reverse Repo, Global M2, PBOC Liquidity |
| 9 | `TECHNICAL_BREAKOUT` | Technical Breakout | BTC Price vs MA200, RSI, Volume, Key Resistance |
| 10 | `GEOPOLITICAL_SAFE_HAVEN` | Geopolitical Safe Haven | Gold Price, BTC/Gold Ratio, Geopolitical Risk Index |

---

## Database (Supabase — `dannifinance` schema)

```
research_sessions
├── id              UUID PK
├── user_id         UUID FK → auth.users
├── title           TEXT
└── created_at      TIMESTAMPTZ

research_messages
├── id              UUID PK
├── session_id      UUID FK → research_sessions
├── role            TEXT CHECK (user | assistant)
├── content         TEXT
└── created_at      TIMESTAMPTZ
```

**Row-Level Security (RLS):** Users can only access their own sessions and messages.

---

## Design System

**Source:** Financial Dashboard + Coding Bootcamp palettes (ui-ux-pro-max)

| Token | Usage | Value |
|-------|-------|-------|
| `--color-background` | Page background | `oklch(0.12 0.02 260)` |
| `--color-surface` | Card background | `oklch(0.16 0.015 258)` |
| `--color-accent` | Primary CTA, links | `oklch(0.58 0.22 265)` |
| `--color-success` | Bullish signals, confidence | `oklch(0.65 0.19 155)` |
| `--color-warning` | Risk, caution | `oklch(0.73 0.15 75)` |
| `--color-danger` | Errors, bearish | `oklch(0.58 0.2 20)` |

**Typography:** Inter (body) + JetBrains Mono (data) via `next/font/google`

---

## Auth Flow

```
1. User visits /research → middleware checks JWT → redirects to /login
2. Sign In: email/password → Supabase auth → JWT cookie set → /research
3. Sign Up: /register → email/password → confirmation email → /auth/callback → JWT → /research
4. Session refresh: middleware.ts on every request
```

**Protected routes:** `/research` only (middleware matcher)

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 (App Router) | Server Components, streaming, Vercel-native |
| Language | TypeScript 5.9 | Type safety across full stack |
| Styling | Tailwind CSS 4 + oklch | Utility-first, perceptually uniform colors |
| UI Primitives | shadcn/ui (New York) | Unstyled, accessible, copy-paste components |
| Auth | Supabase Auth | Email/password, JWT cookies, RLS |
| Database | Supabase PostgreSQL | Managed, pgvector-ready, free tier |
| AI | DeepSeek (`deepseek-chat`) | 1/10 cost of GPT-4, JSON mode |
| Charts | ECharts | Tree-shakeable, dark theme native |
| Deployment | Vercel | Zero-config Next.js hosting |

**V1 explicitly excludes:** Redis, BullMQ, FastAPI, Docker, pgvector, Multi-Agent, WebSocket.

---

## API Reference

### `POST /api/research`

**Request:**
```json
{ "question": "Why is Bitcoin rising today?" }
```

**Response (`ResearchOutput`):**
```json
{
  "summary": "3-4 sentence executive summary...",
  "narratives": [
    {
      "id": "ETF_FLOW",
      "name": "ETF Flows",
      "confidence": 82,
      "reasoning": "ETF inflows remain strong at +$200M/day...",
      "indicators": [
        { "label": "BTC ETF Net Flow", "value": "+$200M", "signal": "bullish" }
      ]
    }
  ],
  "evidence": ["Specific data point 1", "Specific data point 2"],
  "risks": ["What could invalidate this thesis 1"],
  "confidence_score": 75,
  "market_context_used": true
}
```

### `POST /auth/callback`

Handles Supabase email confirmation redirect. Exchanges `code` for session JWT, sets cookies, redirects to `/research`.

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Settings → API (anon key) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production URL for email redirect |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek Platform → API Keys |
| `DIRECT_URL` | Dev only | Supabase → Direct connection string |
| `DATABASE_URL` | Yes | Supabase → Transaction pooler |
| `NEWSAPI_KEY` | No | newsapi.org (falls back gracefully) |

---

## Key Design Decisions

1. **Single Agent, not Multi-Agent.** One DeepSeek call with a structured system prompt simulating multiple analyst perspectives. Multi-Agent adds latency and cost without proven value at V1 scale.

2. **Narrative Registry, not LLM generation.** The LLM matches from 10 pre-defined narratives with defined indicators. This makes analysis verifiable, auditable, and consistent across questions.

3. **Context Augmentation, not RAG.** CoinGecko + NewsAPI fetch real-time data injected into the prompt. No embeddings, no vector DB, no chunking. Simple fetch → inject → analyze.

4. **oklch over hex.** Perceptually uniform color space. No weird perceptual jumps in dark mode. Native CSS support, no preprocessor needed.

5. **Supabase, not local PostgreSQL.** Zero infrastructure overhead. Auth, database, and RLS in one platform. Free tier covers V1 needs.
