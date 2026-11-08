import { z } from "zod";
import { lookupEmail } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { createAuthClient, hasSupabase } from "@/lib/supabase/server";

// POST { email }: sends a 6-digit sign-in code, but only to listed emails.
// The answer is the same either way, so nobody can test which emails are listed.
export async function POST(request: Request) {
  if (!hasSupabase) return Response.json({ ok: false, error: "Sign-in is not set up" }, { status: 503 });
  const parsed = z.object({ email: z.email() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Enter a valid email" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const who = lookupEmail(await (await getBackend()).getSetup(), email);
  if (who.staff || who.admin) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
      const busy = error.status === 429;
      return Response.json(
        { ok: false, error: busy ? "Too many codes sent. Wait a minute and try again." : "Could not send the code" },
        { status: busy ? 429 : 500 },
      );
    }
  }
  return Response.json({ ok: true });
}
