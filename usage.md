# Danni Market Intelligence Terminal — User Manual

> **Product:** Cross-signal market intelligence. Auto-detected anomalies, historical pattern matching, evidence-backed explanations.
>
> **V3.5:** `danni-market-intelligence-v1.vercel.app` — 20+ commits, 14 routes, 11 signals, 7 expectations, 4 betas, 6 evidence templates.

---

## What This Product Is

Danni Market Intelligence Terminal is a **market cognition tool** that automatically scans cross-market signals for anomalies — divergences between what *should* be happening and what *is* happening. V3.5 adds historical pattern matching, evidence-backed explanations, and a browsable research timeline.

It does five things:

1. **Scanner** (`/divergences`) — Automatically detects unusual market signal relationships. No questions needed. Open the app, see what's unusual today.

2. **Divergence Library** (`/patterns`) — Browse historical signal pair outcomes. Which pairs are most reliably bullish? Bearish? How long do divergences typically last?

3. **Research Timeline** (`/timeline`) — Chronological chain of market events. Signal moves → divergences → resolutions, all in one view.

4. **Deep Dive** (`/divergences/[pairId]`) — Full analysis per signal pair: severity, attribution, historical pattern, evidence analysis, AI memo.

5. **Research Chat** (`/research`) — Ask any market question. Get a structured memo with narratives, evidence, risk factors, and cross-signal analysis.

Think of it as: **a junior macro analyst that scans 11 data signals, checks historical patterns, ranks evidence, and writes structured memos — automatically.**

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
1. Go to `danni-market-intelligence-v1.vercel.app`
2. Click **Open Scanner** or navigate to `/register`
3. Enter email + password (min 8 chars) + confirm password
4. Click **Create Account** → check email → click confirmation link
5. You land on the **Scanner Dashboard** automatically

### 2. Use the Scanner (automatic)
- The scanner auto-runs on load — fetches 11 signals, detects divergences, ranks by severity
- **Ranked Anomalies** — Sorted by severity score (0–10). Critical (≥7.0) at the top
- **Historical Outcomes** — Below each card: "42 past cases · 69% bullish · avg +2.1% BTC" with green/red bar
- **Evidence Badge** — Top explanation (Strong/Moderate/Weak) on each card
- **Research Health** — Coverage% · Freshness% · Source Health% at the top
- **Move Attribution** — Shows what % of BTC's move is explained by macro vs unexplained
- **Not Assessable** — Narratives with missing required data (translated names)
- Click any anomaly card → Deep Dive with full memo

### 3. Browse the Pattern Library
- Navigate to `/patterns` via the header link
- **Most Bullish Divergences** — pairs that most often resolve bullish
- **Most Bearish Divergences** — pairs that most often resolve bearish
- **All Pairs** — complete stats: occurrences, resolution rates, avg duration
- Click any pair → Deep Dive

### 4. Explore the Timeline
- Navigate to `/timeline` via the header link
- Color-coded event markers: green (bullish), red (bearish), amber (divergence)
- Filter by date range and signal pair
- Each event shows: type badge (Signal/Divergence/Resolution), severity, description

### 5. Use the Research Chat
- Navigate to `/research` via the header link
- Type any market question → Enter
- Wait 5–15 seconds → Full structured memo

### 6. Switch Language
- Click the 🌐 button in the header (EN / 中文)
- All UI labels switch instantly. Persisted across sessions.

---

## Scanner Dashboard Anatomy

```
┌─────────────────────────────────────────────┐
│  Market Intelligence / 市场情报    🌐 EN     │
│  Timeline · Library · Research Chat · Sign out│
├─────────────────────────────────────────────┤
│                                             │
│  Research Health                            │
│  80% Coverage · 80% Freshness · 75% Source  │
│                                             │
│  ⚠ DXY vs BTC           [危急]  10.0/10    │  ← Severity score (translated)
│  ─────────────────────────────────────────  │
│  DXY ↓ normally → BTC ↑, but BTC ↓          │
│                                             │
│  42 历史案例 · 69% 看涨 · 平均 +2.1% BTC    │  ← Historical outcomes bar
│  ████████████░░░░░░  (green 69%, red 21%)   │
│                                             │
│  ✓ Macro Tailwind Ignored [强]              │  ← Evidence badge
│  -7.0% 未解释                                │
│                    [深度分析 →]              │
│                                             │
│  ✓ 已确认关系                                │
│  US10Y ↑ + BTC ↓                            │
│                                             │
│  不可评估 (2)                                │
│  ETF 资金流 缺失: BTC ETF 资金流             │  ← Translated names
│  机构买入 缺失: BTC ETF 资金流               │
└─────────────────────────────────────────────┘
```

---

## Pages Reference

| Page | URL | Purpose |
|------|-----|---------|
| Scanner | `/divergences` | Auto-scan, ranked anomalies, health |
| Deep Dive | `/divergences/[pairId]` | Full analysis per pair |
| Library | `/patterns` | Historical pair statistics |
| Timeline | `/timeline` | Chronological event chain |
| Research | `/research` | Chat-style Q&A memo |
| Login | `/login` | Email/password sign in |
| Register | `/register` | Create account |

---

## Severity Scores

| Score | Label (EN) | Label (中文) | Meaning |
|-------|-----------|-------------|---------|
| ≥7.0 | Critical | 危急 | Strong correlation pair with large magnitude divergence |
| ≥5.0 | Notable | 显著 | Meaningful divergence — warrants attention |
| ≥3.0 | Moderate | 中等 | Directional violation but low magnitude |
| <3.0 | Minor | 轻微 | Weak signal or tentative relationship |

**Severity is computed from:** correlation strength × signal magnitude × divergence penalty. It is a mathematical product of the data, not an LLM opinion.

---

## Evidence Strength

| Strength | Rule | Meaning |
|----------|------|---------|
| Strong / 强 | ≥3 supporting + 0 contradicting | Multiple independent signals agree |
| Moderate / 中等 | ≥2 supporting | Some evidence, minor counter-evidence |
| Weak / 弱 | otherwise | Limited or mixed evidence |

Evidence is a **rule engine** — not ML, not probability, not prediction. Every supporting and contradicting point references a specific signal value.

---

## Unexplained Move Ratio

| Ratio | Meaning |
|-------|---------|
| >1.0 | More of the move is unexplained than explained → crypto-specific factors dominant |
| 0.5–1.0 | Macro explains roughly half the move |
| <0.5 | Most of the move aligns with macro signals |

---

## Research Health Dimensions

| Dimension | What It Measures | Good | Bad |
|-----------|-----------------|------|-----|
| Coverage | Available / total signals | ≥80% | <50% |
| Freshness | Signals <24h old | ≥80% | <50% stale |
| Source Health | Data sources OK | 100% | Any failures |

No composite score. No traffic light. You see the numbers and judge for yourself.

---

## User Personas

### Persona 1 — Independent Researcher
**Who:** Crypto-native analyst scanning for edge.

**Workflow:** Opens scanner each morning → checks top anomalies → clicks deep dive on anything ≥7.0 severity → uses timeline for context → research chat for follow-up.

**Value:** Saves 30–60 minutes of manual cross-asset correlation checking. Historical outcomes show if the divergence is actionable.

---

### Persona 2 — Fund Analyst / Portfolio Manager
**Who:** Writes investment memos for internal or client use.

**Workflow:** Opens scanner → checks unexplained move ratio → if >1.0, investigates via deep dive → checks historical precedent → copies structured memo as first draft.

**Value:** First-draft memo in 10 seconds. Historical pattern data provides statistical context ("this has happened 42 times"). Evidence engine surfaces the most likely explanation.

---

### Persona 3 — Crypto Content Creator
**Who:** Newsletter, Substack, YouTube, podcast.

**Workflow:** Scanner provides the daily anomaly hook. Pattern library shows which narratives are most relevant. Timeline gives the chronological story. Deep dive gives structured analysis.

**Value:** Research assistant that pre-frames the analysis with historical data and evidence. Creator adds voice and distribution.

---

### Persona 4 — TradFi Professional Learning Crypto
**Who:** Equities/FX/fixed-income pro allocating to crypto.

**Workflow:** Uses scanner to understand crypto through familiar macro lenses (DXY, yields, gold). Attribution model translates macro moves into expected crypto impact. Chinese UI for Mandarin-speaking users.

**Value:** Bridges TradFi mental models to crypto. "DXY ↓ should mean BTC ↑ — but it's not. This has happened 42 times before and resolved bullishly 69% of the time."

---

## Tips for Best Results

1. **Check the scanner daily.** The value is in what changed — new divergences, resolved divergences, shifting severity scores.

2. **Use the patterns library.** Before acting on a divergence, check its historical resolution rate.

3. **Look at the timeline.** The chain of events matters more than any single signal.

4. **Use research chat for depth.** Scanner finds the anomaly. Chat explains it in detail.

5. **Challenge the analysis.** "Has this pattern happened before?" or "What would contradict this explanation?"

6. **Watch the unexplained ratio.** When >1.0, macro isn't driving the bus — something else is.

7. **Trust the health bars.** Low coverage or stale data means lower quality analysis.

---

## Data Sources (V3.5)

| Source | Signals | Status |
|--------|---------|--------|
| CoinGecko | BTC price, ETH price, Gold (XAUT) | ✅ Free, no key |
| FRED | DXY, US10Y, US2Y, Fed Funds | ✅ Free key (fred.stlouisfed.org) |
| NewsAPI | Market headlines | ✅ Free tier (100/day) |
| Farside | BTC ETF daily net flow | ❌ Permanently down (Cloudflare) |

---

## Privacy & Data

- All queries and scanner results private to your account
- Divergence history stored with Row-Level Security (you only see your own)
- Signal history is public market data (readable by all, writable by cron)
- No data shared, sold, or used for training
- Market data fetched in real-time, stored for historical pattern matching

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS 4, oklch, Inter + JetBrains Mono |
| UI | shadcn/ui (New York), lucide-react |
| Auth | Supabase Auth (email/password, JWT, RLS) |
| Database | Supabase PostgreSQL (dannifinance schema, 4 tables) |
| AI | DeepSeek (`deepseek-chat`, JSON mode) |
| Cron | Vercel Cron (daily signal snapshot) |
| i18n | Custom LocaleProvider + dictionaries (en/zh) |
| Deployment | Vercel |

---

## Support

Danni Market Intelligence Terminal — V3.5 (June 2026).

- GitHub: `github.com/gloria238/danni-market-intelligence-v1`

---

*Last updated: 2026-06-03 — V3.5*
