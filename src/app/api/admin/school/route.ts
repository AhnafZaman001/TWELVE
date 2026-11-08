import { requireAccess } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { schoolSchema } from "@/lib/entities";

export async function PUT(request: Request) {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const parsed = schoolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const db = await getBackend();
  return Response.json({ ok: true, school: await db.saveSchool(parsed.data) });
}
