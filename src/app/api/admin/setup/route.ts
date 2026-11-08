import { getBackend } from "@/lib/data";
import { blockInProduction } from "@/lib/guard";

export async function GET() {
  const blocked = blockInProduction();
  if (blocked) return blocked;
  const db = await getBackend();
  return Response.json({ ...(await db.getSetup()), backend: db.name });
}
