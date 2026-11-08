import { buildBoard } from "@/lib/board";
import { getBackend } from "@/lib/data";
import { localParts } from "@/lib/time";

// GET /api/board?at=08:30  (at = optional demo clock, HH:MM)
export async function GET(request: Request) {
  const at = new URL(request.url).searchParams.get("at");
  const db = await getBackend();
  const schedule = await db.getSchedule();
  const now = new Date();
  const [rooms, checks, staff, reports] = await Promise.all([
    db.getRooms(),
    db.getChecks(),
    db.getStaff(),
    db.listReports(localParts(now, schedule.timezone).dateKey),
  ]);
  const board = buildBoard({
    rooms,
    reports,
    checks,
    staff,
    schedule,
    now,
    clockOverride: at && /^\d{2}:\d{2}$/.test(at) ? at : undefined,
  });
  return Response.json({ ...board, backend: db.name });
}
