import { NextRequest, NextResponse } from "next/server";
import { generateResearch } from "@/lib/ai";
import {
  fetchMarketSnapshot,
  fetchNewsHeadlines,
  type MarketContext,
} from "@/lib/market-data";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Fetch market context in parallel
    const [snapshot, headlines] = await Promise.all([
      fetchMarketSnapshot().catch(() => null),
      fetchNewsHeadlines().catch(() => []),
    ]);

    const marketCtx: MarketContext = { snapshot, headlines };
    const result = await generateResearch(question.trim(), marketCtx);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
