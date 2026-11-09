import { getBackend, listSchools } from "@/lib/data";
import { roomsDueForRenewal } from "@/lib/qr";

// Daily job (vercel.json): for every school, renews QR codes older than that
// school's auto-renew period. Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production";
  if (!authorized) return Response.json({ ok: false }, { status: 401 });

  const renewed: Record<string, number> = {};
  for (const slug of await listSchools()) {
    const db = await getBackend(slug);
    const due = roomsDueForRenewal(await db.getSetup());
    if (due.length) await db.renewQr(due);
    renewed[slug ?? "sample"] = due.length;
  }
  return Response.json({ ok: true, renewed });
}
