// Picks the storage backend: Supabase when its keys are set in .env.local,
// otherwise in-memory sample data so the app still runs.
import "server-only";
import { memoryBackend } from "./backend/memory";
import type { Backend } from "./backend/types";
import { hasSupabase } from "./supabase/server";

// slug: a specific school (background jobs); omitted: the school whose web
// address the current request came in on.
export async function getBackend(slug?: string): Promise<Backend> {
  if (!hasSupabase) return memoryBackend;
  const { supabaseBackendFor } = await import("./backend/supabase");
  return supabaseBackendFor(slug);
}

// Every school in the database (one in sample mode).
export async function listSchools(): Promise<(string | undefined)[]> {
  if (!hasSupabase) return [undefined];
  const { listSchoolSlugs } = await import("./backend/supabase");
  return listSchoolSlugs();
}
