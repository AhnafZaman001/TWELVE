// Supabase client for sign-in, bound to the visitor's cookies. Uses the public
// (publishable) key: it acts as the signed-in person, never with admin rights.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function createAuthClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a page render, where cookies are read-only; proxy.ts refreshes them
        }
      },
    },
  });
}
