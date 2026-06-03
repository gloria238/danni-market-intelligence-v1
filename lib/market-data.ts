// Market Data Layer — unified data fetching for all signal sources.
//
// Sources:
//   CoinGecko  — BTC/ETH/Gold price + 24h change (free, no key)
//   FRED       — DXY, US10Y, US2Y, Fed Funds (free key from research.stlouisfed.org)
//   Farside    — BTC ETF daily net flow (free, no key)
//   NewsAPI    — headlines (free tier, 100 req/day)
//
// Each source fetches independently, times out gracefully, never blocks.

import type { SignalValue, SignalDirection } from "@/lib/signals";
import { SIGNAL_REGISTRY } from "@/lib/signals";

// ——— Types ———

export interface MarketSnapshot {
  timestamp: number;
  signals: Record<string, SignalValue>;
  availableCount: number;
  totalCount: number;
}

export interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface MarketContext {
  snapshot: MarketSnapshot | null;
  headlines: NewsHeadline[];
}

// ——— Helpers ———

const DEFAULT_TIMEOUT = 8000;

async function safeFetch(url: string, timeoutOrOpts?: number | RequestInit, maybeOpts?: RequestInit): Promise<Response | null> {
  const timeoutMs = typeof timeoutOrOpts === "number" ? timeoutOrOpts : DEFAULT_TIMEOUT;
  const opts: RequestInit = typeof timeoutOrOpts === "object" ? timeoutOrOpts : (maybeOpts ?? {});
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function nullSignal(id: string): SignalValue {
  const def = SIGNAL_REGISTRY[id];
  return {
    signalId: id,
    label: def?.label ?? id,
    value: "N/A",
    rawValue: null,
    available: false,
    direction: null,
    directionContext: null,
    delta: null,
    previousValue: null,
  };
}

function valueSignal(
  id: string,
  rawValue: number,
  format: string,
  direction: SignalDirection | null = null,
  directionContext: string | null = null,
  delta: number | null = null,
  previousValue: number | null = null
): SignalValue {
  const def = SIGNAL_REGISTRY[id];
  return {
    signalId: id,
    label: def?.label ?? id,
    value: format,
    rawValue,
    available: true,
    direction,
    directionContext,
    delta,
    previousValue,
  };
}

function deriveDirection(current: number, previous: number): { direction: SignalDirection | null; context: string } {
  const delta = current - previous;
  if (Math.abs(delta) < 0.001) return { direction: "stable", context: "unchanged from prior" };
  if (delta > 0) return { direction: "rising", context: `↑ from ${previous.toFixed(2)} prior` };
  return { direction: "falling", context: `↓ from ${previous.toFixed(2)} prior` };
}

// ——— CoinGecko ———

async function fetchCoinGecko(): Promise<Record<string, SignalValue>> {
  const signals: Record<string, SignalValue> = {};
  const res = await safeFetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether-gold&vs_currencies=usd&include_24hr_change=true"
  );
  if (!res) return signals;

  const data = await res.json();

  // BTC Price — direction + delta from 24h change
  const btcUsd = data?.bitcoin?.usd;
  if (btcUsd != null) {
    const change24h = data?.bitcoin?.usd_24h_change;
    const dir: SignalDirection | null = change24h != null
      ? change24h > 0.5 ? "rising" : change24h < -0.5 ? "falling" : "stable"
      : null;
    const ctx: string | null = change24h != null
      ? `24h: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`
      : null;
    const d = change24h != null ? (btcUsd * change24h) / 100 : null;
    const pv = change24h != null ? btcUsd / (1 + change24h / 100) : null;
    signals.BTC_PRICE = valueSignal("BTC_PRICE", btcUsd, `$${btcUsd.toLocaleString()}`, dir, ctx, d, pv);
  }

  // BTC 24h Change
  if (data?.bitcoin?.usd_24h_change != null) {
    const v = data.bitcoin.usd_24h_change;
    const dir: SignalDirection = v > 0.5 ? "rising" : v < -0.5 ? "falling" : "stable";
    signals.BTC_24H_CHANGE = valueSignal(
      "BTC_24H_CHANGE", v, `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
      dir, dir === "rising" ? "Price increasing" : dir === "falling" ? "Price decreasing" : "Flat over 24h",
      v, null
    );
  }

  // ETH
  if (data?.ethereum?.usd != null) {
    signals.ETH_PRICE = valueSignal("ETH_PRICE", data.ethereum.usd, `$${data.ethereum.usd.toLocaleString()}`);
  }

  // Gold (XAUT proxy)
  const goldUsd = data?.["tether-gold"]?.usd;
  if (goldUsd != null) {
    const change24h = data?.["tether-gold"]?.usd_24h_change;
    const dir: SignalDirection | null = change24h != null
      ? change24h > 0.3 ? "rising" : change24h < -0.3 ? "falling" : "stable"
      : null;
    const ctx: string | null = change24h != null
      ? `24h: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`
      : null;
    const d = change24h != null ? (goldUsd * change24h) / 100 : null;
    const pv = change24h != null ? goldUsd / (1 + change24h / 100) : null;
    signals.GOLD_PRICE = valueSignal("GOLD_PRICE", goldUsd, `$${goldUsd.toLocaleString()}`, dir, ctx, d, pv);
  }

  return signals;
}

// ——— FRED ———
// Returns { latest, previous } for directional comparison

async function fetchFredSeries(seriesId: string): Promise<{ latest: number; previous: number } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn(`[fred] skipping ${seriesId} — no FRED_API_KEY`);
    return null;
  }

  const res = await safeFetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=30&sort_order=desc`,
    15000 // FRED is slow from Vercel's IP — needs > 8s
  );
  if (!res) {
    console.warn(`[fred] ${seriesId} — fetch failed or timed out`);
    return null;
  }

  try {
    const data = await res.json();
    const observations = data?.observations;
    if (!observations || observations.length < 2) {
      console.warn(`[fred] ${seriesId} — no observations returned (count: ${observations?.length ?? 0})`);
      return null;
    }

    // Walk forward from most recent to find valid numeric values
    const values: number[] = [];
    for (const obs of observations) {
      const v = parseFloat(obs?.value);
      if (!isNaN(v)) values.push(v);
      if (values.length >= 2) break;
    }

    if (values.length < 2) {
      // Only one valid value — return it with itself as "previous"
      const single = values[0];
      if (single == null) {
        console.warn(`[fred] ${seriesId} — no valid numeric values in ${observations.length} observations (all "." or NaN)`);
        return null;
      }
      console.warn(`[fred] ${seriesId} — only 1 valid value, using as latest + previous`);
      return { latest: single, previous: single };
    }

    return { latest: values[0], previous: values[1] };
  } catch {
    return null;
  }
}

async function fetchFred(): Promise<Record<string, SignalValue>> {
  const signals: Record<string, SignalValue> = {};
  const fredSignals = Object.values(SIGNAL_REGISTRY).filter((s) => s.source === "fred");

  // Stagger requests to avoid FRED rate-limiting 4 parallel calls from Vercel's IP.
  // Without stagger, DGS2 and DGS10 reliably timeout while DXY and FEDFUNDS succeed.
  const results: Array<{ id: string; pair: { latest: number; previous: number } | null }> = [];
  for (const def of fredSignals) {
    const pair = await fetchFredSeries(def.sourceId);
    results.push({ id: def.id, pair });
  }

  for (const { id, pair } of results) {
    if (pair) {
      const isYieldOrRate = id.includes("YIELD") || id.includes("RATE");
      const format = isYieldOrRate ? `${pair.latest.toFixed(2)}%` : pair.latest.toFixed(2);
      const { direction, context } = deriveDirection(pair.latest, pair.previous);
      const delta = pair.latest - pair.previous;
      const prev = pair.latest !== pair.previous ? pair.previous : null;
      signals[id] = valueSignal(id, pair.latest, format, direction, context, delta, prev);
    }
  }

  return signals;
}

// ——— Farside ———

interface FarsideFlow {
  date?: string;
  total?: number;
}

async function fetchFarside(): Promise<Record<string, SignalValue>> {
  const signals: Record<string, SignalValue> = {};
  const res = await safeFetch("https://farside.co.uk/data/btc/all.json");
  if (!res) {
    console.warn("[farside] fetch failed or timed out (farside.co.uk may be down)");
    return signals;
  }

  try {
    const data: FarsideFlow[] = await res.json();
    if (!Array.isArray(data) || data.length < 2) return signals;

    const today = data[data.length - 1];
    const yesterday = data[data.length - 2];

    if (today?.total != null) {
      const flow = today.total;
      const prevFlow = yesterday?.total ?? null;
      const dir: SignalDirection =
        flow > 50 ? "rising" : flow < -50 ? "falling" : "stable";
      const delta = prevFlow != null ? flow - prevFlow : null;
      const directionContext =
        prevFlow != null
          ? `${flow > prevFlow ? "↑" : flow < prevFlow ? "↓" : "→"} prior day: ${prevFlow >= 0 ? "+" : ""}$${prevFlow.toFixed(0)}M`
          : "Prior day data unavailable";

      const last7 = data.slice(-7);
      const weekFlow = last7.reduce((sum: number, d: FarsideFlow) => sum + (d.total ?? 0), 0);
      const fmt = `${flow >= 0 ? "+" : ""}$${flow.toFixed(0)}M (5d: ${weekFlow >= 0 ? "+" : ""}$${weekFlow.toFixed(0)}M)`;
      signals.BTC_ETF_FLOW = valueSignal("BTC_ETF_FLOW", flow, fmt, dir, directionContext, delta, prevFlow);
    }
  } catch {
    // silent
  }

  return signals;
}

// ——— NewsAPI ———

export async function fetchNewsHeadlines(
  query: string = "crypto OR bitcoin OR macro"
): Promise<NewsHeadline[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  const res = await safeFetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=8&language=en`,
    { headers: { "X-Api-Key": apiKey } }
  );
  if (!res) return [];

  try {
    const data = await res.json();
    return (data.articles || []).map((a: any) => ({
      title: a.title || "",
      source: a.source?.name || "Unknown",
      url: a.url || "",
      publishedAt: a.publishedAt || "",
    }));
  } catch {
    return [];
  }
}

// ——— Unified Fetch ———

export async function fetchAllMarketData(): Promise<MarketSnapshot> {
  const emptySignals: Record<string, SignalValue> = {};
  const [cg, fred, farside] = await Promise.all([
    fetchCoinGecko().catch(() => emptySignals),
    fetchFred().catch(() => emptySignals),
    fetchFarside().catch(() => emptySignals),
  ]);

  const signals: Record<string, SignalValue> = {};
  for (const id of Object.keys(SIGNAL_REGISTRY)) {
    signals[id] = nullSignal(id);
  }

  for (const source of [cg, fred, farside]) {
    for (const [id, val] of Object.entries(source) as [string, SignalValue][]) {
      if (val.available) signals[id] = val;
    }
  }

  // News is a special case — populate if headlines exist (handled in API route)
  // Don't pre-populate here since headlines are fetched separately

  const totalCount = Object.keys(SIGNAL_REGISTRY).length;
  const availableCount = Object.values(signals).filter((s) => s.available).length;

  return { timestamp: Date.now(), signals, availableCount, totalCount };
}

// ——— Prompt formatting ———

export function formatMarketContextForPrompt(
  snapshot: MarketSnapshot,
  headlines: NewsHeadline[]
): string {
  const parts: string[] = [];

  const available = Object.values(snapshot.signals).filter((s) => s.available);
  const unavailable = Object.values(snapshot.signals).filter((s) => !s.available);

  parts.push(
    `## DATA SIGNALS: ${snapshot.availableCount}/${snapshot.totalCount} available\n`
  );

  if (available.length > 0) {
    parts.push("### Available:");
    for (const s of available) {
      let line = `- ${s.label}: ${s.value}`;
      if (s.direction) {
        const arrow = s.direction === "rising" ? "▲" : s.direction === "falling" ? "▼" : "—";
        line += ` [${arrow}]`;
      }
      if (s.directionContext) line += ` (${s.directionContext})`;
      parts.push(line);
    }
  }

  if (unavailable.length > 0) {
    parts.push("\n### Unavailable:");
    for (const s of unavailable) {
      parts.push(`- ${s.label}: N/A`);
    }
  }

  parts.push(
    "\n⚠️ CRITICAL: Indicators shown in the output MUST come from the signals listed above. Do NOT use a signal as evidence for a narrative it doesn't belong to. For example, BTC_PRICE is NOT evidence of institutional buying — only ETF flow is. Each narrative's valid signals are specified in the narrative framework above."
  );

  // News
  if (headlines.length > 0) {
    parts.push(
      "\n## MARKET NEWS\n" +
        headlines
          .map(
            (h, i) =>
              `${i + 1}. [${h.source}] ${h.title} (${new Date(h.publishedAt).toLocaleDateString()})`
          )
          .join("\n")
    );
  }

  return parts.join("\n");
}
