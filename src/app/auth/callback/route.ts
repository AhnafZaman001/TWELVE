import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { checkSignIn } from "@/lib/sign-in";
import { createAuthClient } from "@/lib/supabase/server";

// Google sends people back here after they choose their account.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const back = (error: string) =>
    NextResponse.redirect(new URL(`/login?error=${error}&next=${encodeURIComponent(next)}`, url.origin));

  const code = url.searchParams.get("code");
  if (!code) return back("failed");
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return back("failed");

  const sessionId = sessionIdOf(data.session?.access_token);
  const result = await checkSignIn(request, { email: data.user.email.toLowerCase(), sessionId, method: "google" });
  if (!result.allowed) {
    await supabase.auth.signOut();
    return back("not-invited");
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

// The session id inside the new access token (just read, it was issued a moment ago)
function sessionIdOf(token: string | undefined) {
  try {
    const payload = JSON.parse(Buffer.from(token!.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}
