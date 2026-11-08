// Until admin login exists, admin and demo APIs only work on a developer's
// laptop. On a deployed site they refuse unless ALLOW_OPEN_ADMIN=1 is set.
export function blockInProduction(): Response | null {
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_OPEN_ADMIN === "1") return null;
  return Response.json({ ok: false, error: "Admin login is not set up yet" }, { status: 403 });
}
