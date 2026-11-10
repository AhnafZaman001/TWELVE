// Runs right after any sign-in (Google, password or e-mail code):
// only listed emails may stay signed in, and an admin's sign-in is e-mailed.
// The e-mail goes out after the response, so sign-in stays fast, and at most
// once per sign-in session, so calling this again cannot flood anyone's inbox.
import "server-only";
import { after } from "next/server";
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
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const userAgent = request.headers.get("user-agent") ?? "";
    const { dateKey } = localParts(new Date(), setup.school.timezone);
    after(async () => {
      if (!(await db.logAlertOnce(dateKey, `signin:${signedIn.sessionId}`))) return;
      const out = await emailSignIn(
        setup,
        { email: admin.email, name: admin.name, role: admin.role },
        signedIn.method,
        { ip, userAgent },
      );
      if (!out.sent) console.warn("Sign-in e-mail not sent:", out.reason);
    });
  }
  return { allowed: true as const };
}

// How the current session was signed in, from the token's "amr" claim
export function methodFromClaims(claims: Record<string, unknown> | undefined): SignInMethod {
  const amr = Array.isArray(claims?.amr) ? (claims.amr as { method?: string }[]) : [];
  const latest = amr[0]?.method;
  return latest === "password" ? "password" : latest === "otp" || latest === "magiclink" ? "code" : "google";
}
