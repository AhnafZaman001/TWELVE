import { requireAccess } from "@/lib/auth";
import { z } from "zod";
import { getBackend } from "@/lib/data";
import { roomsToRenew } from "@/lib/qr";

const body = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("rooms"), roomIds: z.array(z.string()).min(1).max(1000) }),
  z.object({ scope: z.literal("group"), groupId: z.string().min(1) }),
  z.object({ scope: z.literal("all") }),
]);

// POST { scope: "rooms", roomIds } | { scope: "group", groupId } | { scope: "all" }
export async function POST(request: Request) {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Choose what to renew" }, { status: 400 });

  const db = await getBackend();
  const ids = roomsToRenew(await db.getSetup(), parsed.data);
  if (ids.length === 0) return Response.json({ ok: false, error: "No active rooms to renew" }, { status: 400 });
  const rooms = await db.renewQr(ids);
  return Response.json({ ok: true, renewed: rooms.length });
}
