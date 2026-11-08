import { getChecks, getRooms, getSchedule, getStaff } from "@/lib/data";
import { seedSampleDay } from "@/lib/demo-seed";
import { clearReports } from "@/lib/store";

// Demo helpers while reports live in memory.
// POST: replace today's reports with a sample morning. DELETE: clear all reports.
export async function POST() {
  clearReports();
  const count = seedSampleDay({
    rooms: getRooms(),
    checks: getChecks(),
    staff: getStaff(),
    schedule: getSchedule(),
  });
  return Response.json({ ok: true, count });
}

export async function DELETE() {
  clearReports();
  return Response.json({ ok: true });
}
