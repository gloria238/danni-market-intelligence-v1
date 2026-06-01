// Context Augmentation Layer — NOT RAG.
// Fetches real-time market data and injects into LLM prompt.
//
// Free data sources:
//   CoinGecko  — BTC, ETH price (free, no key)
//   NewsAPI    — headlines (free tier, 100 req/day)
//
// For SPX/DXY/VIX/US10Y we need a premium API (e.g., Alpha Vantage, Polygon).
// V1 accepts this gap — the LLM fills in from training data when unavailable.

export interface MarketSnapshot {
  timestamp: number;
  btc: { price: number | null; change24h: number | null };
  eth: { price: number | null; change24h: number | null };
  // Not available in free tier — set on V2 with premium API
  spx: { price: null; change24h: null };
  nasdaq: { price: null; change24h: null };
  dxy: { price: null; change24h: null };
  gold: { price: null; change24h: null };
  us10y: { price: null; change24h: null };
  vix: { price: null; change24h: null };
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

// CoinGecko free API — BTC/ETH only (no key required)
// Works from Vercel; may be blocked behind GFW in local dev.
export async function fetchMarketSnapshot(): Promise<MarketSnapshot | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
      { signal: controller.signal, next: { revalidate: 60 } }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    return {
      timestamp: Date.now(),
      btc: {
        price: data?.bitcoin?.usd ?? null,
        change24h: data?.bitcoin?.usd_24h_change ?? null,
      },
      eth: {
        price: data?.ethereum?.usd ?? null,
        change24h: data?.ethereum?.usd_24h_change ?? null,
      },
      spx: { price: null, change24h: null },
      nasdaq: { price: null, change24h: null },
      dxy: { price: null, change24h: null },
      gold: { price: null, change24h: null },
      us10y: { price: null, change24h: null },
      vix: { price: null, change24h: null },
    };
  } catch {
    return null;
  }
}

// NewsAPI — free tier (100 req/day), gracefully degrades if key is missing
export async function fetchNewsHeadlines(
  query: string = "crypto OR bitcoin OR macro"
): Promise<NewsHeadline[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=8&language=en`,
      {
        headers: { "X-Api-Key": apiKey },
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];
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

// Format market context into a compact prompt block
export function formatMarketContextForPrompt(ctx: MarketContext): string {
  const parts: string[] = [];

  if (ctx.snapshot && (ctx.snapshot.btc.price || ctx.snapshot.eth.price)) {
    const s = ctx.snapshot;
    const lines: string[] = [];

    if (s.btc.price) {
      lines.push(
        `- BTC: $${s.btc.price.toLocaleString()}${s.btc.change24h != null ? ` (24h: ${s.btc.change24h >= 0 ? "+" : ""}${s.btc.change24h.toFixed(2)}%)` : ""}`
      );
    }
    if (s.eth.price) {
      lines.push(
        `- ETH: $${s.eth.price.toLocaleString()}${s.eth.change24h != null ? ` (24h: ${s.eth.change24h >= 0 ? "+" : ""}${s.eth.change24h.toFixed(2)}%)` : ""}`
      );
    }

    parts.push(
      `## CURRENT MARKET DATA (REAL-TIME)\n${lines.join("\n")}\n\nTimestamp: ${new Date(s.timestamp).toISOString()}\n\nIMPORTANT: Use the ABOVE real-time data as ground truth. If data is available, prioritize it over your training knowledge.`
    );
  } else {
    parts.push(
      "## MARKET DATA: UNAVAILABLE\n" +
        "Market data could not be fetched. Use your training knowledge but acknowledge this gap.\n" +
        "Set confidence scores lower and note that analysis is NOT based on real-time data."
    );
  }

  if (ctx.headlines.length > 0) {
    parts.push(
      "## LATEST MARKET NEWS\n" +
        ctx.headlines
          .map(
            (h, i) =>
              `${i + 1}. [${h.source}] ${h.title} (${new Date(h.publishedAt).toLocaleDateString()})`
          )
          .join("\n") +
        "\n\nReference specific news stories when relevant to the analysis."
    );
  }

  return parts.join("\n\n");
}
