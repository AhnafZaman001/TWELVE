import { getBackend } from "@/lib/data";
import { sampleDay } from "@/lib/demo-seed";
import { localParts } from "@/lib/time";

// Demo helpers. POST: replace today's reports with a sample morning.
// DELETE: clear today's reports.
async function today() {
  const db = await getBackend();
  const schedule = await db.getSchedule();
  return { db, schedule, dateKey: localParts(new Date(), schedule.timezone).dateKey };
}

export async function POST() {
  const { db, schedule, dateKey } = await today();
  const [rooms, checks, staff] = await Promise.all([db.getRooms(), db.getChecks(), db.getStaff()]);
  await db.clearReports(dateKey);
  const items = sampleDay({ rooms, checks, staff, schedule });
  for (const { report, problems, receivedAt } of items) {
    await db.saveReport(report, problems, receivedAt);
  }
  return Response.json({ ok: true, count: items.length, backend: db.name });
}

export async function DELETE() {
  const { db, dateKey } = await today();
  await db.clearReports(dateKey);
  return Response.json({ ok: true });
}
