import { requireAccess } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { sampleDay } from "@/lib/demo-seed";
import { localParts } from "@/lib/time";

// Demo helpers. POST: replace today's reports with a sample morning.
// DELETE: clear today's reports.
async function today() {
  const db = await getBackend();
  const setup = await db.getSetup();
  return { db, setup, dateKey: localParts(new Date(), setup.school.timezone).dateKey };
}

export async function POST() {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const { db, setup, dateKey } = await today();
  await db.clearReports(dateKey);
  const reports = sampleDay(setup);
  for (const report of reports) await db.saveReport(report);
  return Response.json({ ok: true, count: reports.length, backend: db.name });
}

export async function DELETE() {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const { db, dateKey } = await today();
  await db.clearReports(dateKey);
  return Response.json({ ok: true });
}
