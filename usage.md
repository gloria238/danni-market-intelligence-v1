# Danni Research Terminal — User Manual

> **Product:** AI-powered market research. Ask any market question. Get a structured investment memo.
>
> **V1:** `danni-terminal.vercel.app`

---

## What This Product Is

Danni Research Terminal is **not** a trading platform, a charting tool, or a crypto price tracker.

It is a **market cognition tool**. You ask a question about markets. It returns a structured analysis: which narratives are driving price action, what evidence supports each hypothesis, what risks you should monitor, and how confident the analysis is.

Think of it as a **junior macro analyst that reads faster than you, writes in structured JSON, and never sleeps.**

---

## What This Product Is NOT

- ❌ A trading signal generator
- ❌ A price prediction machine
- ❌ A replacement for your own judgment
- ❌ A real-time execution platform

It helps you _think_ about markets. It does not tell you what to do.

---

## User Personas

### Persona 1 — The Independent Researcher

**Who:** A crypto-native analyst, DeFi strategist, or macro-curious investor who spends hours reading CT (Crypto Twitter), Discord, and Dune dashboards.

**Pain point:** Information overload. Thousands of data points, no structured way to separate signal from noise.

**Use case:**
- Morning routine: "What happened in crypto overnight?"
- Before a trade: "Why is ETH underperforming BTC?"
- Macro check: "How are rate expectations shifting?"

**Value:** Saves 30–60 minutes of manual synthesis per query. Structured output forces disciplined thinking.

---

### Persona 2 — The Portfolio Manager / Fund Analyst

**Who:** Works at a crypto fund, family office, or wealth management desk. Needs to write investment memos for internal decision-making or client communication.

**Pain point:** Writing market commentary is repetitive, time-consuming, and inconsistent in quality.

**Use case:**
- Weekly market review: "Summarize this week's key crypto narratives."
- Pre-meeting brief: "What's the bull and bear case for BTC at $65K?"
- Client memo: "Generate a one-page market outlook."

**Value:** First-draft memos in 10 seconds instead of 45 minutes. Consistent structure enables comparison across time periods.

---

### Persona 3 — The Crypto-Finance Content Creator

**Who:** Runs a newsletter, Substack, YouTube channel, or podcast about crypto markets. Needs to produce high-quality analysis consistently.

**Pain point:** Content production bottleneck. Research takes 3x longer than writing.

**Use case:**
- Thread drafting: "Give me 5 narratives explaining today's BTC move."
- Newsletter research: "Deep-dive into ETF flow dynamics."
- Script outline: "What's the macro backdrop for crypto this week?"

**Value:** Research assistant that pre-frames the analysis. Content creator adds voice, opinion, and distribution.

---

### Persona 4 — The TradFi Professional Learning Crypto

**Who:** Equities, FX, or fixed-income professional allocating to crypto for the first time. Understands macro but doesn't know crypto-native narratives.

**Pain point:** Crypto markets move on different drivers than traditional assets. Need translation.

**Use case:**
- "Explain why crypto is correlated with NASDAQ today."
- "What is a short squeeze in crypto context?"
- "How does ETF flow impact BTC differently than equity ETF flows?"

**Value:** Bridges TradFi mental models to crypto-native concepts through structured analysis.

---

## Usage Examples

### Example 1 — Simple Market Question

**Input:**
> Why is Bitcoin rising today?

**Output (excerpt):**

> **Executive Summary**
> Bitcoin is rising today due to strong ETF inflows (+$200M), a weakening DXY (-0.8%), and shifting Fed rate cut expectations. Multiple converging signals suggest institutional accumulation rather than speculative leverage.

> **Key Narratives**
>
> #1 — ETF Flows — 82% confidence
> Reasoning: Spot BTC ETFs saw net inflows of $200M, continuing a 5-day streak.
> Evidence:
> * ↗ BTC ETF Net Flow: +$200M
> * ↗ IBIT Volume: $1.2B
> * → Coinbase Premium: +0.3%
>
> #2 — USD Weakness — 68% confidence
> Reasoning: DXY declined 0.8% as Euro strengthened on ECB guidance.
> Evidence:
> * ↘ DXY: -0.8%
> * ↗ EUR/USD: +0.6%
>
> #3 — Rate Cut Expectations — 61% confidence
> Reasoning: CME FedWatch now shows 70% probability of September cut.
> Evidence:
> * → FedWatch Sept Cut: 70%
> * ↘ US10Y: -12bps

> **Risk Factors**
> * CPI print tomorrow could reverse rate cut expectations
> * BTC has failed to break $60K resistance three times
> * Elevated perpetual funding rates increase liquidation risk

> **Overall Confidence: 75%** — Multiple converging signals support this analysis.

---

### Example 2 — Macro Cross-Asset Question

**Input:**
> What's driving gold to all-time highs?

**Output structure:** Same memo format — narratives (USD weakness, geopolitical risk, central bank buying), evidence per narrative, risks (rate reversal, dollar strength), confidence score.

---

### Example 3 — Scenario Analysis

**Input:**
> How would a 50bps Fed cut impact crypto markets?

**Output structure:** Narratives (risk-on surge, USD crash, liquidity boost), evidence from historical episodes, risks (recession signal, "sell the fact"), confidence adjusted for scenario uncertainty.

---

### Example 4 — Risk-Focused Question

**Input:**
> What could go wrong for crypto in Q3 2026?

**Output structure:** Narratives flipped to risk framing, evidence of building vulnerabilities, systematic risk factors, overall confidence in bearish thesis.

---

## How to Use (Step by Step)

### 1. Sign Up
1. Go to `danni-terminal.vercel.app`
2. Click **Start Research** or navigate to `/register`
3. Enter your email and password (min 8 characters)
4. Confirm your password
5. Click **Create Account**
6. Check your email for the confirmation link
7. Click the link — you'll be redirected to the research page

### 2. Ask a Question
1. Type any market question in the input field at the bottom
2. Press **Enter** (or click the send button)
3. Wait ~5–15 seconds for the analysis

### 3. Read the Memo
The memo has five sections:
- **Executive Summary** — 3–4 sentence takeaway
- **Key Narratives** — Ranked by confidence, each with:
  - Confidence percentage
  - Reasoning (1 sentence)
  - Evidence grid (indicators with bull/bear/neutral signals)
- **Supporting Evidence** — Data points backing the analysis
- **Risk Factors** — What could invalidate this thesis
- **Overall Confidence** — Holistic conviction score with interpretation

### 4. Iterate
Ask follow-up questions, drill into specific narratives, or request scenario analysis.

---

## Tips for Best Results

1. **Be specific.** "Why is BTC up 8% today?" is better than "tell me about crypto."

2. **Ask about narratives, not prices.** "What narratives are driving SOL outperformance?" yields better analysis than "Will SOL hit $200?"

3. **Use the vocabulary.** The system recognizes: ETF flows, rate expectations, dollar strength, risk sentiment, regulatory developments, technical levels.

4. **Drill down.** After the first answer, ask: "Tell me more about narrative #2" or "What's the strongest piece of evidence here?"

5. **Challenge the analysis.** Ask: "What might invalidate this thesis?" or "What's the counter-argument?"

---

## Confidence Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 70–100 | Multiple converging signals, high-quality evidence | High conviction thesis |
| 40–69 | Mixed signals, some evidence gaps | Monitor, await confirmation |
| 0–39 | High uncertainty, limited data | Low conviction — position size accordingly |

**Important:** Confidence reflects the _system's assessment_ of how well the evidence supports the narrative. It is NOT a trading signal or a prediction. A high-confidence narrative can still be wrong.

---

## Privacy & Data

- All research queries are private to your account
- Messages are stored in Supabase with Row-Level Security (you can only see your own)
- No data is shared, sold, or used to train models
- Market data is fetched in real-time from CoinGecko (free, anonymous)

---

## Support

Danni Research Terminal is in active development (V1, June 2026).

For issues, feature requests, or questions:
- GitHub: `github.com/gloria238/danni-market-intelligence-v1`
- Email the developer directly

---

*Last updated: 2026-06-01*
