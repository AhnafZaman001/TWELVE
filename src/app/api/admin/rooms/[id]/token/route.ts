import { getBackend } from "@/lib/data";
import { blockInProduction } from "@/lib/guard";

// POST: give the room a new QR code. The old printed QR stops working.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/rooms/[id]/token">) {
  const blocked = blockInProduction();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    return Response.json({ ok: true, row: await (await getBackend()).newRoomToken(id) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
