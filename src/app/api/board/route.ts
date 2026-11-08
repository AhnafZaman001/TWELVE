import { requireAccess } from "@/lib/auth";
import { buildBoard } from "@/lib/board";
import { getBackend } from "@/lib/data";
import { localParts } from "@/lib/time";

// GET /api/board?at=08:30  (at = optional demo clock, HH:MM)
export async function GET(request: Request) {
  const blocked = await requireAccess("board");
  if (blocked) return blocked;
  const at = new URL(request.url).searchParams.get("at");
  const db = await getBackend();
  const setup = await db.getSetup();
  const now = new Date();
  const reports = await db.listReports(localParts(now, setup.school.timezone).dateKey);
  const board = buildBoard({
    setup,
    reports,
    now,
    clockOverride: at && /^\d{2}:\d{2}$/.test(at) ? at : undefined,
  });
  return Response.json({ ...board, backend: db.name });
}
