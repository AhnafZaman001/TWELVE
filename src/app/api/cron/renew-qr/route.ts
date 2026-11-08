import { getBackend } from "@/lib/data";
import { roomsDueForRenewal } from "@/lib/qr";

// Daily job (vercel.json): renews QR codes older than the school's auto-renew
// period. Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production";
  if (!authorized) return Response.json({ ok: false }, { status: 401 });

  const db = await getBackend();
  const due = roomsDueForRenewal(await db.getSetup());
  if (due.length) await db.renewQr(due);
  return Response.json({ ok: true, renewed: due.length });
}
