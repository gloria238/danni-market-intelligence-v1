// V3: Daily signal snapshot cron endpoint.
// Triggered by Vercel Cron — fetches all market data and persists to signal_history.
// Protected by CRON_SECRET env var.
//
// Schedule: 0 0 * * * (daily at midnight UTC)

import { NextRequest, NextResponse } from "next/server";
import { fetchAllMarketData } from "@/lib/market-data";
import { insertBatchSnapshots } from "@/lib/db/signal-history-store";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await fetchAllMarketData();

    if (!snapshot || snapshot.availableCount === 0) {
      return NextResponse.json(
        { recorded: 0, error: "No market data available", timestamp: Date.now() },
        { status: 200 } // 200 so Vercel Cron doesn't retry — data fetch failure is normal
      );
    }

    const inserted = await insertBatchSnapshots(snapshot.signals);

    return NextResponse.json({
      recorded: inserted,
      total: snapshot.totalCount,
      available: snapshot.availableCount,
      timestamp: snapshot.timestamp,
    });
  } catch (error: any) {
    console.error("[cron/signals] error:", error.message);
    return NextResponse.json(
      { recorded: 0, error: error.message, timestamp: Date.now() },
      { status: 200 } // Don't fail the cron — gracefully degrade
    );
  }
}
