// Divergence Observation Store — persist + query divergence history.
// Uses Supabase server client (for RLS) or direct PostgreSQL (for batch ops).

import { createServerSupabase } from "@/lib/supabase/server";

export interface DivergenceRecord {
  id?: string;
  userId: string;
  signalPairId: string;
  observedDate: string;
  severityScore: number;
  divergenceType: "confirmed" | "divergence";
  signalAId: string;
  signalAValue: number | null;
  signalADelta: number | null;
  signalBId: string;
  signalBValue: number | null;
  signalBDelta: number | null;
  resolutionDate?: string | null;
  resolutionDirection?: string | null;
  resolutionNote?: string | null;
  unexplainedMoveScore?: number | null;
}

export async function getTodayObservations(userId: string): Promise<DivergenceRecord[]> {
  const supabase = await createServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("divergence_observations")
    .select("*")
    .eq("user_id", userId)
    .eq("observed_date", today)
    .order("severity_score", { ascending: false });
  return (data || []) as DivergenceRecord[];
}

export async function getYesterdayObservations(userId: string): Promise<DivergenceRecord[]> {
  const supabase = await createServerSupabase();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("divergence_observations")
    .select("*")
    .eq("user_id", userId)
    .eq("observed_date", yesterday)
    .order("severity_score", { ascending: false });
  return (data || []) as DivergenceRecord[];
}

export async function getByDateRange(
  userId: string, from: string, to: string, pairId?: string
): Promise<DivergenceRecord[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from("divergence_observations").select("*")
    .eq("user_id", userId)
    .gte("observed_date", from)
    .lte("observed_date", to)
    .order("observed_date", { ascending: false })
    .order("severity_score", { ascending: false });
  if (pairId) query = query.eq("signal_pair_id", pairId);
  const { data } = await query;
  return (data || []) as DivergenceRecord[];
}

export async function getResolutionStats(userId: string, pairId: string): Promise<{
  totalDivergences: number; resolvedCount: number; avgDaysToResolve: number | null;
  bullishResolutions: number; bearishResolutions: number;
}> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("divergence_observations").select("*")
    .eq("user_id", userId).eq("signal_pair_id", pairId)
    .eq("divergence_type", "divergence").not("resolution_date", "is", null);

  const resolved = (data || []) as DivergenceRecord[];
  const bullishResolutions = resolved.filter((r) => r.resolutionDirection?.includes("bullish")).length;
  const bearishResolutions = resolved.filter((r) => r.resolutionDirection?.includes("bearish")).length;

  let avgDaysToResolve: number | null = null;
  if (resolved.length > 0) {
    const days = resolved.map((r) => {
      if (!r.resolutionDate) return 0;
      return (new Date(r.resolutionDate).getTime() - new Date(r.observedDate).getTime()) / 86400000;
    });
    avgDaysToResolve = Math.round(days.reduce((a, b) => a + b, 0) / days.length * 10) / 10;
  }

  const { count } = await supabase.from("divergence_observations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId).eq("signal_pair_id", pairId).eq("divergence_type", "divergence");

  return {
    totalDivergences: count || 0,
    resolvedCount: resolved.length,
    avgDaysToResolve,
    bullishResolutions,
    bearishResolutions,
  };
}

export async function insertDivergence(record: DivergenceRecord): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.from("divergence_observations").upsert({
    user_id: record.userId,
    signal_pair_id: record.signalPairId,
    observed_date: record.observedDate,
    severity_score: record.severityScore,
    divergence_type: record.divergenceType,
    signal_a_id: record.signalAId,
    signal_a_value: record.signalAValue,
    signal_a_delta: record.signalADelta,
    signal_b_id: record.signalBId,
    signal_b_value: record.signalBValue,
    signal_b_delta: record.signalBDelta,
    resolution_date: record.resolutionDate,
    resolution_direction: record.resolutionDirection,
    resolution_note: record.resolutionNote,
    unexplained_move_score: record.unexplainedMoveScore,
  }, { onConflict: "signal_pair_id, observed_date, user_id", ignoreDuplicates: true });
}

export async function resolveDivergence(
  userId: string, signalPairId: string, observedDate: string,
  direction: string, note: string
): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.from("divergence_observations").update({
    resolution_date: new Date().toISOString().slice(0, 10),
    resolution_direction: direction,
    resolution_note: note,
  }).eq("user_id", userId).eq("signal_pair_id", signalPairId).eq("observed_date", observedDate);
}
