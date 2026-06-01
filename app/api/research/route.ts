import { NextRequest, NextResponse } from "next/server";
import { generateResearch } from "@/lib/ai";
import { detectIntent } from "@/lib/intent";
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

    // 1. Detect intent — normalize before the LLM ever sees it
    const intent = detectIntent(question.trim());

    // 2. Fetch market context in parallel
    const [snapshot, headlines] = await Promise.all([
      fetchMarketSnapshot().catch(() => null),
      fetchNewsHeadlines().catch(() => []),
    ]);

    const marketCtx: MarketContext = { snapshot, headlines };

    // 3. Generate — passes intent to the prompt builder
    const result = await generateResearch(question.trim(), marketCtx, intent);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
