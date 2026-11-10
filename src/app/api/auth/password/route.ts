import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createAuthClient, hasSupabase } from "@/lib/supabase/server";

// PUT { password }: the signed-in person sets or changes their own password,
// so next time they can sign in with email and password.
export async function PUT(request: Request) {
  if (!hasSupabase) return Response.json({ ok: false, error: "Sign-in is not set up" }, { status: 503 });
  const viewer = await getViewer();
  if (!viewer || (!viewer.admin && !viewer.staff)) {
    return Response.json({ ok: false, error: "Please sign in" }, { status: 401 });
  }
  const parsed = z
    .object({ password: z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters") })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password" }, { status: 400 });
  }
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const reauth = /reauth|nonce|recent/i.test(error.message);
    return Response.json(
      {
        ok: false,
        error: reauth
          ? "For safety, sign out and sign in again, then set the password."
          : error.message.includes("same")
            ? "That is already your password."
            : /weak|short|characters/i.test(error.message)
              ? error.message
              : "Could not set the password. Try again.",
      },
      { status: 400 },
    );
  }
  return Response.json({ ok: true });
}
