# V2 Architecture Plan — From Research Terminal to Market Intelligence Terminal

> **Status:** Planning · 2026-06-01
>
> **V1.5 baseline:** 13 commits, 2,118 lines core logic, 11 signals, 10 narratives, 7 signal expectations, 1 divergence engine

---

## 1. Where We Are (V1.5)

```
User asks a question
       ↓
Intent detection (lib/intent.ts)
       ↓
Fetch all signals (lib/market-data.ts) — CoinGecko + FRED + Farside + NewsAPI
       ↓
Divergence detection (lib/expectations.ts) — 7 signal pairs, pure computation
       ↓
Narrative coverage check (lib/narratives.ts) — hard gates: required vs enhancing
       ↓
LLM synthesis (lib/ai.ts) — cross-signal block injected into system prompt
       ↓
Memo renderer — divergence cards + assessable narratives + not-assessable list
```

**What works:**
- Signal → Narrative → Memo pipeline is complete
- Directional context per signal (▲▼—, not just bare numbers)
- Hard gates on narrative activation (missing required signal → Not Assessable)
- Cross-signal divergence detection (expectation vs observation)
- Signal ≠ Evidence enforced (BTC price is NOT evidence of institutional buying)

**The gap that V2 addresses:**
- V1.5 is pull-based: user must ask a question to get analysis
- Divergences are buried inside a memo response, not surfaced independently
- No severity quantification — "notable" is a label, not a score
- No historical context — "has this divergence happened before? how did it resolve?"
- No decomposition of price moves into explained vs unexplained factors

---

## 2. The Core Insight Driving V2

V1.5 proved something: **a divergence is more valuable than a confirmation.**

Users don't open the product to read "everything is normal." They open it to find what's *unusual*. The divergence engine already detects unusual signal relationships. V2's job is to make those divergences the primary product surface — not a subsection of a question-response memo.

**The product identity shift:**

| V1 | V2 |
|----|-----|
| Research Terminal | Market Intelligence Terminal |
| User asks → system answers | System detects → user investigates |
| Pull: "Why is BTC rising?" | Push: "BTC is behaving unusually today" |
| Memo is the product | Divergence scanner is the product; memo is the detail view |
| One question at a time | Browse, rank, filter anomalies |

---

## 3. Phased Roadmap

### V1.6 — Divergence Ranking + Unexplained Move Score

**Two new capabilities:**

#### 3a. Severity Scoring (numeric)

Current: binary detection + `"notable" | "moderate" | "minor"` label.

V1.6: numeric score 0.0–10.0 per divergence, computed as:

```
severity = w_correlation × w_magnitude × penalty_multiplier

Where:
  w_correlation  = 3.0 (strong) | 2.0 (moderate) | 1.0 (tentative)
  
  w_magnitude    = min(|delta_A_norm| + |delta_B_norm|, 5.0)
                   where delta_norm = |delta| / typical_stddev_of_signal
  
  penalty        = 1.5 if opposite-to-expected (true divergence)
                   1.0 if same-as-expected (confirmation)
```

This gives:
- DXY -0.8% vs BTC -5% on a strong inverse pair → severity ~9.2
- DXY -0.1% vs BTC -0.3% on a strong inverse pair → severity ~3.1
- DXY -0.1% vs BTC +0.3% on a strong inverse pair → severity ~2.5 (confirmed, not divergence)

**New file:** `lib/ranking.ts`

#### 3b. Unexplained Move Score (attribution model)

Decompose BTC's price movement into factor contributions:

```
BTC actual move: -1.36%

Expected contribution from DXY (-0.08% × β_DXY_BTC of -2.5):  +0.20%
Expected contribution from US10Y (-3bps × β_YIELD_BTC of -0.6): +0.18%
Expected contribution from Gold (+0.1% × β_GOLD_BTC of +0.6):  +0.06%

Total explained: +0.44%  (BTC should be UP ~0.4%)
Actual:           -1.36%
Unexplained:      -1.80%

Unexplained Move Score: 1.80 / 1.36 = 1.32  (>1.0 = more unexplained than explained)
```

**Beta coefficient registry (initial hardcoded values):**

| From | To | β | Direction | Source |
|------|-----|---|-----------|--------|
| DXY | BTC | -2.5 | inverse | Practitioner estimate |
| US10Y | BTC | -0.6 | inverse | 25bps cut → ~15% BTC rally historically implies ~0.6% per 1bp yield move |
| Gold | BTC | +0.6 | direct | Weak positive correlation |
| ETF Flow | BTC | +0.3 | direct | $100M flow → ~30bps price impact (rough) |

These are deliberately rough — the framework matters more than precision at this stage. A user seeing "80% of today's move is unexplained" learns something regardless of whether the true β is 2.5 or 2.3.

**New files:** `lib/betas.ts`, `lib/attribution.ts`

**UI changes:**
- Divergence cards show numeric severity score instead of "Notable"
- New section in Cross-Signal Analysis: "Move Attribution" — waterfall breakdown
- Top divergence gets highlighted with severity badge

---

### V1.7 — Divergence History + Resolution Tracking

**New database table:**

```sql
CREATE TABLE dannifinance.divergence_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_pair_id TEXT NOT NULL,          -- e.g. "DXY_BTC"
  observed_date DATE NOT NULL,
  severity_score NUMERIC(4,2) NOT NULL,
  divergence_type TEXT NOT NULL,         -- 'confirmed' | 'divergence'
  
  signal_a_id TEXT NOT NULL,
  signal_a_value NUMERIC,
  signal_a_delta NUMERIC,               -- change from prior observation
  
  signal_b_id TEXT NOT NULL,
  signal_b_value NUMERIC,
  signal_b_delta NUMERIC,
  
  resolution_date DATE,                 -- NULL while unresolved
  resolution_direction TEXT,            -- 'realigned_bullish' | 'realigned_bearish' | 'persisted' | 'reversed'
  resolution_note TEXT,
  
  unexplained_move_score NUMERIC(5,2),  -- from V1.6 attribution model
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_divergence_date ON dannifinance.divergence_observations(observed_date DESC);
CREATE INDEX idx_divergence_pair ON dannifinance.divergence_observations(signal_pair_id);
```

**Resolution tracking:**
- Persist every divergence detection (both confirmed and divergent pairs)
- On subsequent days, check if previously-divergent pairs have realigned
- Record: how many days to resolve, direction of resolution
- Compute stats: "DXY-BTC divergences resolve bullishly 73% of the time within 3 days"

**New files:**
- `lib/db/divergence-store.ts` — CRUD for divergence observations
- `app/api/divergences/route.ts` — GET historical divergences with filtering
- `lib/resolution.ts` — resolution checker (re-run expectations on new day's data, compare to prior)

**New page:** `/divergences` — historical divergence browser

---

### V2 — Divergence Scanner (Proactive Intelligence)

**The big shift:** Pull → Push.

The user opens the app and sees a ranked list of today's most interesting market anomalies. They didn't need to ask anything. The system already scanned.

```
┌─────────────────────────────────────────────────┐
│  Today's Market Anomalies       6/10 signals    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠ #1  BTC vs DXY                  9.2/10     │
│  ─────────────────────────────────────────────  │
│  Macro conditions increasingly supportive       │
│  but BTC declining sharply.                     │
│  Unexplained: -1.80%                            │
│  Resolution signal: ETF Flow                    │
│              [View Full Memo]                   │
│                                                 │
│  ⚠ #2  Gold vs DXY                  6.3/10     │
│  ─────────────────────────────────────────────  │
│  DXY declining without gold confirmation —      │
│  temporary dollar move or risk extreme?         │
│              [View Full Memo]                   │
│                                                 │
│  ✓ #3  US2Y vs US10Y                5.9/10     │
│  ─────────────────────────────────────────────  │
│  Curve steepening via front-end rally —         │
│  bond market pricing dovish Fed.                │
│              [View Full Memo]                   │
│                                                 │
│  ── Yesterday's divergences ──                  │
│  DXY_BTC (9.2 → resolved bullish, +3.2%)       │
│  GOLD_BTC (5.1 → still active)                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**New pages:**
- `/divergences` — Scanner dashboard (becomes the new "home" after login)
- `/divergences/[pairId]` — Detail view: full memo for one signal pair
- `/research` — Still exists as the question-asking interface (not removed)

**Architecture:**

```
                    V2 Architecture
                         │
            ┌────────────┼────────────┐
            │            │            │
        /divergences  /research   /api/divergences
       (Scanner)     (Chat)       (Historical API)
            │            │            │
            └────────────┼────────────┘
                         │
              ┌──────────▼──────────┐
              │  Divergence Scanner  │
              │  (new entry point)   │
              │  1. Fetch signals    │
              │  2. Detect diverg.   │
              │  3. Rank by severity │
              │  4. Score unexplained│
              │  5. Check history    │
              │  6. Persist new obs  │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    Divergence      Attribution      Historical
    Engine          Model            Store
    (existing,      (V1.6 new)       (V1.7 new)
     enhanced)
         │               │               │
         └───────────────┼───────────────┘
                         │
              ┌──────────▼──────────┐
              │  LLM: explain this  │
              │  specific divergence│
              └─────────────────────┘
```

---

## 4. New Modules by Phase

### V1.6 new modules

| File | Lines (est.) | Responsibility |
|------|-------------|----------------|
| `lib/betas.ts` | ~60 | Beta coefficient registry. Hardcoded initial values per signal pair. Function: `getBeta(signalA, signalB) → number`. Function: `estimateExpectedMove(signal, delta, target) → number`. |
| `lib/attribution.ts` | ~120 | Attribution model. Input: BTC actual move + all signal deltas. Output: `{ drivers: FactorContribution[], explained: number, unexplained: number, score: number }`. Decomposes BTC move into per-factor contributions. |
| `lib/ranking.ts` | ~100 | Severity scoring. Input: DivergenceObservation. Output: numeric score 0-10. Formula: `w_correlation × w_magnitude × penalty`. Also: `rankDivergences(observations) → sorted by severity`. |

### V1.7 new modules

| File | Lines (est.) | Responsibility |
|------|-------------|----------------|
| `lib/db/divergence-store.ts` | ~150 | CRUD for divergence_observations table. `insertDivergence()`, `getByDateRange()`, `getByPair()`, `resolveDivergence()`, `getResolutionStats()`. Uses Supabase client. |
| `app/api/divergences/route.ts` | ~60 | REST API: `GET /api/divergences?pair=DXY_BTC&from=2026-05-01&to=2026-06-01`. Returns historical divergence records. |
| `lib/resolution.ts` | ~80 | Resolution checker. Compares today's divergence state to yesterday's persisted state. Marks resolved divergences with direction and duration. |
| `app/divergences/page.tsx` | ~250 | Historical browser page. Table with sorting/filtering. Resolution timeline. Stats cards: "73% resolve bullishly", "avg 3.2 days to resolve". |

### V2 new modules

| File | Lines (est.) | Responsibility |
|------|-------------|----------------|
| `app/(dashboard)/page.tsx` | ~300 | Scanner dashboard (V2 home). Auto-runs divergence scan on load. Ranked anomaly cards. Unexplained move breakdown. "Yesterday's resolutions" section. |
| `components/scanner/anomaly-card.tsx` | ~150 | Reusable anomaly card. Severity gauge, signal pair visualization, unexplained score, resolution signal hint, "View Memo" → deep-dive. |
| `components/scanner/attribution-waterfall.tsx` | ~120 | Waterfall chart showing BTC move decomposition: total move → per-factor contributions → unexplained residual. |
| `app/divergences/[pairId]/page.tsx` | ~200 | Single-divergence deep dive. Full memo for one signal pair. Historical context: "this pair has diverged X times, resolved Y% bullishly". Related narratives. |

### Modified modules

| File | Change |
|------|--------|
| `lib/expectations.ts` | Add `typicalStdDev` field per expectation for magnitude normalization |
| `lib/signals.ts` | SignalValue adds `delta` and `previousValue` fields for magnitude |
| `lib/market-data.ts` | Signal fetching stores prior observation for delta computation |
| `lib/ai.ts` | New function: `explainDivergence(pair, signals)` — specialized prompt for single-divergence deep-dive memo |
| `middleware.ts` | New protected route: `/divergences` |
| `CLAUDE.md` | Architecture layer update: SIGNALS → DIVERGENCE → ATTRIBUTION → NARRATIVES → MEMO |

---

## 5. Database Evolution

```
V1.0-V1.5:
  research_sessions
  research_messages

V1.7 adds:
  divergence_observations
    ├── id, signal_pair_id, observed_date
    ├── severity_score, divergence_type
    ├── signal_a/b values + deltas
    ├── resolution_date, resolution_direction
    └── unexplained_move_score

V2 adds:
  signal_history          (optional — for backtesting β coefficients)
    ├── signal_id, date
    ├── value, delta
    └── source
```

---

## 6. Product Identity Shift

The `/divergences` scanner page becomes the default post-login destination — not `/research`.

### Navigation V2

```
Logged-in user lands on:  /divergences  (Scanner Dashboard)
                           │
                    ┌──────┼──────┐
                    │             │
               Click anomaly   Ask a question
                    │             │
                    ▼             ▼
          /divergences/[id]    /research
          (Deep-dive memo)    (Chat + memo)
```

### The `/divergences` page answers, without being asked:

1. **What's unusual today?** — Ranked anomalies
2. **How severe?** — Numeric scores with clear thresholds
3. **What's driving it?** — Attribution breakdown per anomaly
4. **What data would resolve it?** — Missing signal hints
5. **Has this happened before?** — Historical context from divergence store
6. **What happened last time?** — Resolution stats

### The `/research` page still exists for:

- Custom scenarios ("What if the Fed cuts 50bps?")
- Multi-asset questions ("Compare BTC and gold narratives")
- Deep dives on specific topics ("Analyze ETF flow dynamics this week")
- Questions the scanner didn't anticipate

---

## 7. What We Are NOT Building in V2

| Feature | Why not |
|---------|---------|
| Dashboard (TradingView widgets, price grids) | Not core to intelligence value prop |
| Portfolio tracker | Different product category entirely |
| Real-time WebSocket prices | CoinGecko polling sufficient for research cadence |
| Multi-Agent LLM orchestration | Single agent + structured prompt proven sufficient |
| Custom narrative builder (user-defined narratives) | Registry should expand based on our data, not user config |
| Alert notifications (email/push) | Premature without proving users return for scanner |
| Backtesting framework | Requires signal history DB — V3 territory |
| Scenario engine (user-defined "what if") | Separate product feature; /research chat handles this adequately |
| Custom dashboard layouts | Premature optimization of UI before core value proven |

---

## 8. Key Technical Decisions

### 8a. Beta coefficients start hardcoded, not ML-derived

Rolling correlation windows require >90 days of signal history. We don't have that yet. Hardcoded practitioner estimates are:
- Faster to ship (no data pipeline needed)
- Honest about what they are (estimates, not computed)
- Sufficient for the "explained vs unexplained" dichotomy
- Upgradable later when signal_history table exists

User sees: "~80% of today's move is unexplained by available macro signals" — this is directionally correct even if β_DXY_BTC is 2.5 rather than the "true" 2.7.

### 8b. Resolution tracking is passive, not a background job

No cron, no worker, no queue. When a user opens `/divergences`, the system:
1. Runs current divergence detection
2. Loads yesterday's persisted observations from the DB
3. Compares: which yesterday-divergences are now resolved?
4. Updates resolution fields in the DB
5. Shows both current anomalies + recent resolutions

This keeps the entire system serverless (Vercel-compatible). No BullMQ, no Redis, no background processes.

### 8c. `/divergences` is the new home, not a replacement for `/research`

Both pages coexist. The scanner is the proactive surface. The chat is the deep-dive tool. A user might:
- Open the app → see BTC-DXY divergence at 9.2 severity
- Click "View Memo" → get a full analysis of that specific divergence
- Then type "What would resolve this?" in the research chat
- The chat has context: it knows which divergence the user was looking at

---

## 9. V1.6 → V1.7 → V2 Timeline Estimate

| Phase | Scope | Days | Key risk |
|-------|-------|------|----------|
| V1.6 | Ranking + Attribution | 2 | Beta calibration feels arbitrary |
| V1.7 | History + Resolution | 2 | DB migration, RLS for new table |
| V2 | Scanner + New Home | 3 | Getting the scanner UI right — it's the new first impression |

Total: ~7 days to V2 from V1.5 baseline.

**Mitigation for beta risk:** Label them as "estimated coefficients" in the UI. Add a small "?" tooltip explaining the methodology. Users understand that attribution models are approximate — they use them daily in Bloomberg PORT and similar tools.

---

## 10. Success Criteria for V2

A user who has never seen the product before opens `/divergences` and:

1. **Within 5 seconds,** sees a ranked list of today's anomalies
2. **Within 15 seconds,** understands what the top anomaly means ("BTC should be up given macro conditions but it's down")
3. **Within 30 seconds,** clicks into one anomaly and gets a full memo
4. **Comes back the next day** to see if the divergence resolved — without anyone telling them to

The metric that matters: **return rate to the scanner page.** Not DAU. Not session duration. Not question count. Just: do they come back to see what's unusual today?

---

*Plan written 2026-06-01 · Based on V1.5 commit `6fcbf84`*
