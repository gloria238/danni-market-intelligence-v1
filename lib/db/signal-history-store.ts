// Signal History Store — daily market data snapshots.
//
// Layer 3.5 of the reasoning stack:
//   SIGNALS → DIVERGENCE → ATTRIBUTION → HISTORICAL MEMORY → PATTERNS → ...
//
// Each row is one signal's value on one date. This table powers pattern matching:
// "When DXY was falling and BTC was falling, what happened next?"
//
// Uses service_role client — market data is public, not user-scoped.

import { createClient } from "@supabase/supabase-js";
import type { SignalValue } from "@/lib/signals";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface SignalPoint {
  signalId: string;
  value: number;
  delta: number | null;
  source: string;
  recordedAt: string; // YYYY-MM-DD
}

export async function insertBatchSnapshots(
  signals: Record<string, SignalValue>
): Promise<number> {
  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;

  for (const [signalId, sv] of Object.entries(signals)) {
    if (!sv.available || sv.rawValue == null) continue;

    const { error } = await supabase.from("signal_history").upsert(
      {
        signal_id: signalId,
        value: sv.rawValue,
        delta: sv.delta,
        source: sv.signalId, // use the signal definition source
        recorded_at: today,
      },
      { onConflict: "signal_id, recorded_at", ignoreDuplicates: true }
    );

    if (!error) inserted++;
    else console.error(`[signal_history] failed to insert ${signalId}:`, error.message);
  }

  return inserted;
}

export async function getSignalHistory(
  signalId: string,
  fromDate: string,
  toDate: string
): Promise<SignalPoint[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("signal_history")
    .select("signal_id, value, delta, source, recorded_at")
    .eq("signal_id", signalId)
    .gte("recorded_at", fromDate)
    .lte("recorded_at", toDate)
    .order("recorded_at", { ascending: true });

  return ((data || []) as any[]).map((r) => ({
    signalId: r.signal_id,
    value: Number(r.value),
    delta: r.delta != null ? Number(r.delta) : null,
    source: r.source,
    recordedAt: r.recorded_at,
  }));
}

export async function getDailySnapshot(date: string): Promise<SignalPoint[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("signal_history")
    .select("signal_id, value, delta, source, recorded_at")
    .eq("recorded_at", date);

  return ((data || []) as any[]).map((r) => ({
    signalId: r.signal_id,
    value: Number(r.value),
    delta: r.delta != null ? Number(r.delta) : null,
    source: r.source,
    recordedAt: r.recorded_at,
  }));
}

export async function getHistoryAge(): Promise<{
  earliestDate: string;
  totalDays: number;
}> {
  const supabase = getServiceClient();

  const { data: first } = await supabase
    .from("signal_history")
    .select("recorded_at")
    .order("recorded_at", { ascending: true })
    .limit(1);

  const { count } = await supabase
    .from("signal_history")
    .select("*", { count: "exact", head: true });

  const earliestDate = first?.[0]?.recorded_at ?? new Date().toISOString().slice(0, 10);
  return { earliestDate, totalDays: count ?? 0 };
}

export async function getMatchingDays(
  signalAId: string,
  dirA: "rising" | "falling",
  signalBId: string,
  dirB: "rising" | "falling",
  fromDate: string,
  toDate: string
): Promise<SignalPoint[][]> {
  const supabase = getServiceClient();

  // Find dates where signalA had direction = dirA (delta sign matches)
  const { data: rowsA } = await supabase
    .from("signal_history")
    .select("recorded_at, delta")
    .eq("signal_id", signalAId)
    .gte("recorded_at", fromDate)
    .lte("recorded_at", toDate)
    .order("recorded_at", { ascending: true });

  if (!rowsA || rowsA.length < 2) return [];

  // Find dates where signalB had direction = dirB
  const { data: rowsB } = await supabase
    .from("signal_history")
    .select("recorded_at, delta")
    .eq("signal_id", signalBId)
    .gte("recorded_at", fromDate)
    .lte("recorded_at", toDate)
    .order("recorded_at", { ascending: true });

  if (!rowsB || rowsB.length < 2) return [];

  // Filter to matching direction days
  const matchDatesA = new Set(
    rowsA
      .filter((r: any) => {
        const d = Number(r.delta);
        return dirA === "rising" ? d > 0 : d < 0;
      })
      .map((r: any) => r.recorded_at)
  );

  const matchDatesB = new Set(
    rowsB
      .filter((r: any) => {
        const d = Number(r.delta);
        return dirB === "rising" ? d > 0 : d < 0;
      })
      .map((r: any) => r.recorded_at)
  );

  // Intersection: days where BOTH signals had the matching direction
  const commonDates = [...matchDatesA].filter((d) => matchDatesB.has(d)).sort();

  // For each matching date, get both signal values
  const results: SignalPoint[][] = [];
  for (const date of commonDates.slice(0, 200)) {
    // cap at 200 to keep queries reasonable
    const snapshot = await getDailySnapshot(date);
    if (snapshot.length >= 2) results.push(snapshot);
  }

  return results;
}
