// V5.5: Research Timeline API — chronological market event feed.
// Auth-gated. Queries signal_history + divergence_observations.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getTimeline } from "@/lib/timeline";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const pair = searchParams.get("pair") || undefined;

  try {
    const result = await getTimeline(supabase, from, to, pair);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/timeline] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
