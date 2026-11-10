import { z } from "zod";
import { requireAccess } from "@/lib/auth";
import { getBackend } from "@/lib/data";

// POST /api/admin/order  { kind, ids }  → ids[0] gets order 1, ids[1] order 2, …
// Used after dragging tiles. Only rows whose order changed are written.
const body = z.object({
  kind: z.enum(["groups", "rooms", "sections", "rounds", "checks"]),
  ids: z.array(z.string().min(1)).min(1).max(2000),
});

export async function POST(request: Request) {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid order" }, { status: 400 });
  const { kind, ids } = parsed.data;

  const db = await getBackend();
  const current = new Map((await db.getSetup())[kind].map((r) => [r.id, r.sort]));
  if (ids.some((id) => !current.has(id))) {
    return Response.json({ ok: false, error: "Something was changed elsewhere. Reload and try again." }, { status: 409 });
  }
  const changed = ids.map((id, i) => ({ id, sort: i + 1 })).filter((r) => current.get(r.id) !== r.sort);
  try {
    await db.setSort(kind, changed);
    return Response.json({ ok: true, changed: changed.length });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Could not save order" }, { status: 500 });
  }
}
