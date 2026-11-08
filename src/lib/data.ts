// Picks the storage backend: Supabase when its keys are set in .env.local,
// otherwise in-memory sample data so the app still runs.
import "server-only";
import { memoryBackend } from "./backend/memory";
import type { Backend } from "./backend/types";
import { localParts } from "./time";
import type { Round, Schedule } from "./types";

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getBackend(): Promise<Backend> {
  if (!hasSupabase) return memoryBackend;
  const { supabaseBackend } = await import("./backend/supabase");
  return supabaseBackend;
}

// Round 2 starts at schedule.round2Time in the school's timezone.
export function currentRound(schedule: Schedule, now: Date = new Date()): Round {
  return localParts(now, schedule.timezone).hhmm >= schedule.round2Time ? 2 : 1;
}
