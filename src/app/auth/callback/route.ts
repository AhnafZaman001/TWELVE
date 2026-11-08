import { NextResponse } from "next/server";
import { lookupEmail, safeNext } from "@/lib/auth";
import { getBackend } from "@/lib/data";
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

  const who = lookupEmail(await (await getBackend()).getSetup(), data.user.email);
  if (!who.staff && !who.admin) {
    await supabase.auth.signOut();
    return back("not-invited");
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
