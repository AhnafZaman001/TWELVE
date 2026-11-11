// "Sign in every time": each sign-in hands out one entry pass, a short-lived
// cookie signed by the server. Opening TWELVE (scanning any QR, opening the
// board or admin, refreshing, coming back later) uses the pass up; without a
// pass the old sign-in is thrown away and the person must sign in again.
// Used by proxy.ts and the sign-in routes. Web Crypto, so it runs anywhere.

export const ENTRY_COOKIE = "twelve_entry";
export const ENTRY_SECONDS = 5 * 60; // time to land on the page after signing in

const encoder = new TextEncoder();

async function hmac(text: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const key = await crypto.subtle.importKey("raw", encoder.encode(`twelve-entry:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
  return Buffer.from(sig).toString("base64url");
}

export async function newEntryPass() {
  const body = `${Math.floor(Date.now() / 1000) + ENTRY_SECONDS}.${crypto.randomUUID()}`;
  return `${body}.${await hmac(body)}`;
}

export async function isValidEntryPass(value: string | undefined) {
  if (!value) return false;
  const i = value.lastIndexOf(".");
  if (i < 0) return false;
  const body = value.slice(0, i);
  const expires = Number(body.split(".")[0]);
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false;
  return (await hmac(body)) === value.slice(i + 1);
}

export const entryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ENTRY_SECONDS,
};
