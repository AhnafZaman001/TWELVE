// Who is signed in, and what they may do. Only emails in Staff or Admins can
// use TWELVE; a valid Google account alone is not enough.
// Without Supabase keys (local sample mode) there is no sign-in and the app is
// open, for demos on a developer's laptop only.
import "server-only";
import { cache } from "react";
import { getBackend } from "./data";
import { createAuthClient, hasSupabase } from "./supabase/server";
import type { Admin, Setup, Staff } from "./types";

export const authEnabled = hasSupabase;

export interface Viewer {
  email: string;
  staff: Staff | null; // can report from a room QR
  admin: Admin | null; // can use the board; owner/admin also the admin screen
}

export function lookupEmail(setup: Setup, email: string) {
  const e = email.trim().toLowerCase();
  return {
    staff: setup.staff.find((s) => s.active && s.email === e) ?? null,
    admin: setup.admins.find((a) => a.email === e) ?? null,
  };
}

// The signed-in email, checked once per page. getClaims verifies the session
// token locally when Supabase uses signing keys, without a network round trip.
const signedInEmail = cache(async (): Promise<string | null> => {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  return typeof email === "string" && email ? email.toLowerCase() : null;
});

export async function getViewer(setup?: Setup): Promise<Viewer | null> {
  if (!authEnabled) return null;
  const email = await signedInEmail();
  if (!email) return null;
  return { email, ...lookupEmail(setup ?? (await (await getBackend()).getSetup()), email) };
}

export type Access = "board" | "admin";

export function canAccess(viewer: Viewer | null, level: Access) {
  if (!viewer?.admin) return false;
  return level === "board" || viewer.admin.role !== "coordinator";
}

// For API routes: null when allowed, otherwise the error response to return.
export async function requireAccess(level: Access): Promise<Response | null> {
  if (!authEnabled) {
    if (process.env.NODE_ENV !== "production") return null;
    return Response.json({ ok: false, error: "Sign-in is not set up" }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return Response.json({ ok: false, error: "Please sign in" }, { status: 401 });
  if (!canAccess(viewer, level)) return Response.json({ ok: false, error: "No access" }, { status: 403 });
  return null;
}

// Only same-site paths, so a sign-in link cannot send people elsewhere.
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
