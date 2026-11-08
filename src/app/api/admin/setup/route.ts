import { requireAccess } from "@/lib/auth";
import { getBackend } from "@/lib/data";

export async function GET() {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const db = await getBackend();
  return Response.json({ ...(await db.getSetup()), backend: db.name });
}
