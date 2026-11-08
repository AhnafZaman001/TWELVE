import { buildBoard } from "@/lib/board";
import { getChecks, getRooms, getSchedule, getStaff } from "@/lib/data";
import { listReports } from "@/lib/store";

// GET /api/board?at=08:30  (at = optional demo clock, HH:MM)
export async function GET(request: Request) {
  const at = new URL(request.url).searchParams.get("at");
  const board = buildBoard({
    rooms: getRooms(),
    reports: listReports(),
    checks: getChecks(),
    staff: getStaff(),
    schedule: getSchedule(),
    now: new Date(),
    clockOverride: at && /^\d{2}:\d{2}$/.test(at) ? at : undefined,
  });
  return Response.json(board);
}
