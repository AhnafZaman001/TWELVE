// Runs right after any sign-in (Google, password or e-mail code):
// only listed emails may stay signed in, and an admin's sign-in is e-mailed.
// The e-mail is sent before the answer goes back (a fraction of a second), at
// most once per sign-in session; if sending fails, the next sign-in tries again.
import "server-only";
import { emailSignIn, type SignInMethod } from "./alerts";
import { lookupEmail } from "./auth";
import { getBackend } from "./data";
import { localParts } from "./time";

export async function checkSignIn(
  request: Request,
  signedIn: { email: string; sessionId: string | null; method: SignInMethod },
) {
  const db = await getBackend();
  const setup = await db.getSetup();
  const who = lookupEmail(setup, signedIn.email);
  if (!who.staff && !who.admin) return { allowed: false as const };

  const admin = who.admin;
  if (admin && signedIn.sessionId) {
    const { dateKey } = localParts(new Date(), setup.school.timezone);
    const kind = `signin:${signedIn.sessionId}`;
    try {
      if (await db.logAlertOnce(dateKey, kind)) {
        const out = await emailSignIn(
          setup,
          { email: admin.email, name: admin.name, role: admin.role },
          signedIn.method,
          {
            ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim(),
            userAgent: request.headers.get("user-agent") ?? "",
          },
        );
        if (!out.sent) {
          console.error("Sign-in e-mail not sent:", out.reason);
          await db.forgetAlert(dateKey, kind);
        }
      }
    } catch (e) {
      // an e-mail problem must never block signing in
      console.error("Sign-in e-mail failed:", e instanceof Error ? e.message : e);
    }
  }
  return { allowed: true as const };
}

// How the current session was signed in, from the token's "amr" claim
export function methodFromClaims(claims: Record<string, unknown> | undefined): SignInMethod {
  const amr = Array.isArray(claims?.amr) ? (claims.amr as { method?: string }[]) : [];
  const latest = amr[0]?.method;
  return latest === "password" ? "password" : latest === "otp" || latest === "magiclink" ? "code" : "google";
}
