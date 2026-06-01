import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pairId = searchParams.get("pair") || undefined;
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);

  let query = supabase.from("divergence_observations").select("*")
    .eq("user_id", user.id)
    .gte("observed_date", from).lte("observed_date", to)
    .order("observed_date", { ascending: false })
    .order("severity_score", { ascending: false });

  if (pairId) query = query.eq("signal_pair_id", pairId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: data?.length || 0 });
}
