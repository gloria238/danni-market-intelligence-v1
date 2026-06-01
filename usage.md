# Danni Market Intelligence Terminal — User Manual

> **Product:** Cross-signal market intelligence. Auto-detected anomalies, structured investment memos.
>
> **V2:** `danni-terminal.vercel.app` — 14 commits, 11 routes, 11 signals, 7 expectations, 4 betas.

---

## What This Product Is

Danni Market Intelligence Terminal is a **market cognition tool** that automatically scans cross-market signals for anomalies — divergences between what *should* be happening and what *is* happening.

It does two things:

1. **Scanner** (`/divergences`) — Automatically detects unusual market signal relationships. No questions needed. Open the app, see what's unusual today.

2. **Research Chat** (`/research`) — Ask any market question. Get a structured memo with narratives, evidence, risk factors, move attribution, and cross-signal analysis.

Think of it as: **a junior macro analyst that scans 11 data signals, computes expectations vs observations, ranks anomalies by severity, and writes structured memos — automatically.**

---

## What This Product Is NOT

- ❌ A trading signal generator
- ❌ A price prediction machine
- ❌ A replacement for your own judgment
- ❌ A real-time execution platform
- ❌ A K-line charting tool
- ❌ A crypto price tracker

It helps you *think* about markets. It does not tell you what to do.

---

## Quick Start

### 1. Sign Up
1. Go to `danni-terminal.vercel.app`
2. Click **Open Scanner** or navigate to `/register`
3. Enter email + password (min 8 chars) + confirm password
4. Click **Create Account** → check email → click confirmation link
5. You land on the **Scanner Dashboard** automatically

### 2. Use the Scanner (automatic)
- The scanner auto-runs on load — fetches 11 signals, detects divergences, ranks by severity
- **Ranked Anomalies** — Sorted by severity score (0–10). Critical (≥7.0) at the top.
- **Move Attribution** — Shows what % of BTC's move is explained by macro vs unexplained
- **Confirmed Relationships** — Signal pairs behaving as expected
- **Not Assessable** — Narratives with missing required data
- Click any anomaly card → Deep Dive with full memo

### 3. Use the Research Chat
- Navigate to `/research` via the header link
- Type any market question → Enter
- Wait 5–15 seconds → Full structured memo

---

## Scanner Dashboard Anatomy

```
┌─────────────────────────────────────────────┐
│  Today's Market Anomalies      6/10 signals  │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠ DXY vs BTC            [NOTABLE]  8.4/10 │  ← Severity score
│  ─────────────────────────────────────────  │
│  DXY ↓ normally → BTC ↑, but BTC ↓          │  ← Directional summary
│  +3.8% unexplained · Resolve: BTC_ETF_FLOW  │  ← Attribution + hint
│              [Deep Dive →]                  │  ← Click for full memo
│                                             │
│  ⚠ US10Y vs BTC           [MODERATE] 5.2/10│
│  ...                                         │
│                                             │
│  ✓ Confirmed Relationships                  │
│  Gold ↑ + DXY ↓ — as expected               │
│                                             │
│  Not Assessable (5)                         │
│  ETF_FLOW missing: BTC_ETF_FLOW             │
└─────────────────────────────────────────────┘
```

---

## Memo Sections (Research Chat + Deep Dive)

### 1. Executive Summary
3–4 sentence takeaway. Leads with the most interesting finding — a divergence if one exists.

### 2. Move Attribution (V2)
Decomposes BTC's price movement into factor contributions:

```
BTC actual: -1.36%
  DXY:      +0.20%  (DXY ↓ → should push BTC ↑)
  US10Y:    +0.18%  (yields ↓ → should push BTC ↑)
  ETF Flow: N/A
  Gold:     +0.06%
  ─────────────────
  Explained: +0.44%
  Unexplained: -1.80%  ← ⚠ crypto-specific factors dominant
```

### 3. Cross-Signal Analysis (V2)
Seven signal pairs tested. Each divergence gets a numeric severity score (0–10). Confirmed relationships shown compactly.

### 4. Key Narratives
Ranked by data coverage. Each narrative shows:
- **Coverage badge** — Assessable or Not Assessable
- **Directional assessment** — What the signal pattern means
- **Evidence grid** — Per-indicator data with ▲▼— direction + Live/Est provenance

### 5. Supporting Evidence + Risk Factors
Evidence references specific data values. Risks list what could invalidate the thesis.

---

## Severity Scores

| Score | Label | Meaning |
|-------|-------|---------|
| ≥7.0 | Critical | Strong correlation pair with large magnitude divergence |
| ≥5.0 | Notable | Meaningful divergence — warrants attention |
| ≥3.0 | Moderate | Directional violation but low magnitude |
| <3.0 | Minor | Weak signal or tentative relationship |

**Severity is computed from:** correlation strength × signal magnitude × divergence penalty. It is a mathematical product of the data, not an LLM opinion.

---

## Unexplained Move Ratio

| Ratio | Meaning |
|-------|---------|
| >1.0 | More of the move is unexplained than explained → crypto-specific factors dominant |
| 0.5–1.0 | Macro explains roughly half the move |
| <0.5 | Most of the move aligns with macro signals |

---

## User Personas

### Persona 1 — Independent Researcher
**Who:** Crypto-native analyst scanning for edge. Reads CT, Discord, Dune.

**Workflow:** Opens scanner each morning → checks top anomalies → clicks deep dive on anything ≥7.0 severity → uses research chat for follow-up questions.

**Value:** Saves 30–60 minutes of manual cross-asset correlation checking.

---

### Persona 2 — Fund Analyst / Portfolio Manager
**Who:** Writes investment memos for internal or client use.

**Workflow:** Opens scanner → checks unexplained move ratio → if >1.0, investigates via deep dive → copies structured memo as first draft for internal note.

**Value:** First-draft memo in 10 seconds. Cross-signal analysis provides the "why" behind price action.

---

### Persona 3 — Crypto Content Creator
**Who:** Newsletter, Substack, YouTube, podcast.

**Workflow:** Scanner provides the daily anomaly hook ("BTC diverging from macro — here's what it means"). Deep dive gives structured analysis to build content around.

**Value:** Research assistant that pre-frames the analysis. Creator adds voice and distribution.

---

### Persona 4 — TradFi Professional Learning Crypto
**Who:** Equities/FX/fixed-income pro allocating to crypto.

**Workflow:** Uses scanner to understand crypto through familiar macro lenses (DXY, yields, gold). Attribution model translates macro moves into expected crypto impact.

**Value:** Bridges TradFi mental models to crypto. "DXY ↓ should mean BTC ↑ — but it's not. That's the story."

---

## Tips for Best Results

1. **Check the scanner daily.** The value is in what changed — new divergences, resolved divergences, shifting severity scores.

2. **Use research chat for depth.** Scanner finds the anomaly. Chat explains it in detail.

3. **Ask about divergences.** "Why is DXY declining but BTC not responding?" gets better analysis than "What's happening with BTC?"

4. **Challenge the analysis.** "What would resolve this divergence?" or "Has this pattern happened before?"

5. **Watch the unexplained ratio.** When >1.0, macro isn't driving the bus — something else is.

---

## Data Sources (V2)

| Source | Signals | Key Required |
|--------|---------|-------------|
| CoinGecko | BTC price, ETH price, Gold (XAUT) | Free, no key |
| FRED | DXY, US10Y, US2Y, Fed Funds | Free key (fred.stlouisfed.org) |
| Farside | BTC ETF daily net flow | Free, no key |
| NewsAPI | Market headlines | Free tier (100/day) |

---

## Privacy & Data

- All queries and scanner results private to your account
- Divergence history stored with Row-Level Security (you only see your own)
- No data shared, sold, or used for training
- Market data fetched in real-time, not stored long-term

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS 4, oklch, Inter + JetBrains Mono |
| UI | shadcn/ui (New York), lucide-react |
| Auth | Supabase Auth (email/password, JWT, RLS) |
| Database | Supabase PostgreSQL (dannifinance schema) |
| AI | DeepSeek (`deepseek-chat`, JSON mode) |
| Deployment | Vercel |

---

## Support

Danni Market Intelligence Terminal — V2.0 (June 2026).

- GitHub: `github.com/gloria238/danni-market-intelligence-v1`

---

*Last updated: 2026-06-01 — V2.0*
