// Market Data Layer — unified data fetching for all signal sources.
//
// Sources:
//   CoinGecko  — BTC/ETH price (free, no key)
//   FRED       — DXY, US10Y, US2Y, Fed Funds, Gold (free key from research.stlouisfed.org)
//   Farside    — BTC ETF flows (free, no key)
//   NewsAPI    — headlines (free tier, 100 req/day)
//
// Each source fetches independently, times out gracefully, never blocks the request.

import type { SignalValue } from "@/lib/signals";
import { SIGNAL_REGISTRY } from "@/lib/signals";

// ——— Types ———

export interface MarketSnapshot {
  timestamp: number;
  /** All resolved signal values, keyed by signal ID */
  signals: Record<string, SignalValue>;
  /** Count of signals with actual data */
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

const FETCH_TIMEOUT = 8000;

async function safeFetch(
  url: string,
  opts: RequestInit = {}
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
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
  };
}

function valueSignal(id: string, rawValue: number, format: string): SignalValue {
  const def = SIGNAL_REGISTRY[id];
  return {
    signalId: id,
    label: def?.label ?? id,
    value: format,
    rawValue,
    available: true,
  };
}

// ——— CoinGecko ———

async function fetchCoinGecko(): Promise<Record<string, SignalValue>> {
  const signals: Record<string, SignalValue> = {};
  const res = await safeFetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
  );
  if (!res) return signals;

  const data = await res.json();

  if (data?.bitcoin?.usd != null) {
    signals.BTC_PRICE = valueSignal(
      "BTC_PRICE",
      data.bitcoin.usd,
      `$${data.bitcoin.usd.toLocaleString()}`
    );
  }
  if (data?.bitcoin?.usd_24h_change != null) {
    const v = data.bitcoin.usd_24h_change;
    signals.BTC_24H_CHANGE = valueSignal(
      "BTC_24H_CHANGE",
      v,
      `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
    );
  }
  if (data?.ethereum?.usd != null) {
    signals.ETH_PRICE = valueSignal(
      "ETH_PRICE",
      data.ethereum.usd,
      `$${data.ethereum.usd.toLocaleString()}`
    );
  }

  return signals;
}

// ——— FRED ———
// Free API key from: https://fred.stlouisfed.org/docs/api/api_key.html

async function fetchFredSeries(seriesId: string): Promise<number | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  const res = await safeFetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc`
  );
  if (!res) return null;

  try {
    const data = await res.json();
    const observations = data?.observations;
    if (!observations || observations.length === 0) return null;

    // Get latest non-numeric observation value
    const latest = observations[0];
    const val = parseFloat(latest?.value);
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

async function fetchFred(): Promise<Record<string, SignalValue>> {
  const signals: Record<string, SignalValue> = {};

  const fredSignals = Object.values(SIGNAL_REGISTRY).filter(
    (s) => s.source === "fred"
  );

  const results = await Promise.all(
    fredSignals.map(async (def) => {
      const val = await fetchFredSeries(def.sourceId);
      return { id: def.id, val };
    })
  );

  for (const { id, val } of results) {
    if (val != null) {
      const format =
        id === "GOLD_PRICE"
          ? `$${val.toFixed(2)}`
          : id.includes("YIELD") || id.includes("RATE")
            ? `${val.toFixed(2)}%`
            : val.toFixed(2);
      signals[id] = valueSignal(id, val, format);
    }
  }

  return signals;
}

// ——— Farside ———
// Free BTC ETF flow data. Endpoint structure documented by Farside.

interface FarsideFlow {
  date?: string;
  total?: number;
  btc_price?: number;
  ibit?: number;
  fbtc?: number;
  gbtc?: number;
  ark?: number;
  bitb?: number;
}

async function fetchFarside(): Promise<Record<string, SignalValue>> {
  const signals: Record<string, SignalValue> = {};
  const res = await safeFetch("https://farside.co.uk/data/btc/all.json");
  if (!res) return signals;

  try {
    const data: FarsideFlow[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return signals;

    // Latest day's flow
    const today = data[data.length - 1];
    if (today?.total != null) {
      const flow = today.total;
      const fmt = flow >= 0 ? `+$${flow.toFixed(0)}M` : `-$${Math.abs(flow).toFixed(0)}M`;
      signals.BTC_ETF_FLOW = valueSignal("BTC_ETF_FLOW", flow, fmt);

      // Also compute weekly flow
      const last7 = data.slice(-7);
      const weekFlow = last7.reduce((sum: number, d: FarsideFlow) => sum + (d.total ?? 0), 0);
      signals.BTC_ETF_FLOW = valueSignal(
        "BTC_ETF_FLOW",
        flow,
        `${fmt} (week: ${weekFlow >= 0 ? "+" : "-"}$${Math.abs(weekFlow).toFixed(0)}M)`
      );
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
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&sortBy=publishedAt&pageSize=8&language=en`,
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

  // Merge all signal sources
  const signals: Record<string, SignalValue> = {};

  // Fill all registered signals with nulls first
  for (const id of Object.keys(SIGNAL_REGISTRY)) {
    signals[id] = nullSignal(id);
  }

  // Override with actual data
  for (const source of [cg, fred, farside]) {
    for (const [id, val] of Object.entries(source) as [string, SignalValue][]) {
      if (val.available) {
        signals[id] = val;
      }
    }
  }

  const totalCount = Object.keys(SIGNAL_REGISTRY).length;
  const availableCount = Object.values(signals).filter((s) => s.available).length;

  return {
    timestamp: Date.now(),
    signals,
    availableCount,
    totalCount,
  };
}

// ——— Prompt formatting ———

export function formatMarketContextForPrompt(
  snapshot: MarketSnapshot,
  headlines: NewsHeadline[]
): string {
  const parts: string[] = [];

  // Signal summary
  parts.push(
    `## SIGNAL COVERAGE: ${snapshot.availableCount}/${snapshot.totalCount} data signals available\n`
  );

  const available = Object.values(snapshot.signals).filter((s) => s.available);
  if (available.length > 0) {
    parts.push("### Available Data:");
    for (const s of available) {
      parts.push(`- ${s.label}: ${s.value}`);
    }
  }

  const unavailable = Object.values(snapshot.signals).filter(
    (s) => !s.available
  );
  if (unavailable.length > 0) {
    parts.push("\n### Missing Data:");
    for (const s of unavailable) {
      parts.push(`- ${s.label}: UNAVAILABLE`);
    }
  }

  parts.push(
    "\nIMPORTANT: Use the ABOVE real-time data as ground truth. When a signal is unavailable, acknowledge the gap — do not invent numbers. Narratives that depend on missing signals should be assessed with lower confidence."
  );

  // News
  if (headlines.length > 0) {
    parts.push(
      "\n## LATEST MARKET NEWS\n" +
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
