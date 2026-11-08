// Picks the storage backend: Supabase when its keys are set in .env.local,
// otherwise in-memory sample data so the app still runs.
import "server-only";
import { memoryBackend } from "./backend/memory";
import type { Backend } from "./backend/types";

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getBackend(): Promise<Backend> {
  if (!hasSupabase) return memoryBackend;
  const { supabaseBackend } = await import("./backend/supabase");
  return supabaseBackend;
}
