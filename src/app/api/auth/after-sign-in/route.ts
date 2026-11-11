import { cookies } from "next/headers";
import { ENTRY_COOKIE, entryCookieOptions, newEntryPass } from "@/lib/entry-pass";
import { checkSignIn, methodFromClaims } from "@/lib/sign-in";
import { createAuthClient, hasSupabase } from "@/lib/supabase/server";

// POST: called by the sign-in page right after a password or e-mail-code
// sign-in. Signs the person out again if their email is not listed, and
// e-mails admins' sign-ins (once per session). Hands out the one entry pass
// that lets the next page open (see proxy.ts).
export async function POST(request: Request) {
  if (!hasSupabase) return Response.json({ ok: false, error: "Sign-in is not set up" }, { status: 503 });
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : null;
  if (!email) return Response.json({ ok: false, error: "Please sign in" }, { status: 401 });

  const sessionId = typeof claims?.session_id === "string" ? claims.session_id : null;
  const result = await checkSignIn(request, { email, sessionId, method: methodFromClaims(claims) });
  if (!result.allowed) {
    await supabase.auth.signOut();
    return Response.json({ ok: false, error: "not-invited" }, { status: 403 });
  }
  (await cookies()).set(ENTRY_COOKIE, await newEntryPass(), entryCookieOptions);
  return Response.json({ ok: true });
}
