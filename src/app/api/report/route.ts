import { getBackend } from "@/lib/data";
import { findProblems, reportSchema } from "@/lib/report";

export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid report" }, { status: 400 });
  }
  const report = parsed.data;
  const db = await getBackend();

  const [room, staff, checks] = await Promise.all([
    db.getRoomByToken(report.roomToken),
    db.getStaff(),
    db.getChecks(),
  ]);
  if (!room) {
    return Response.json({ ok: false, error: "Unknown room" }, { status: 404 });
  }
  if (!staff.some((s) => s.id === report.staffId)) {
    return Response.json({ ok: false, error: "Unknown staff member" }, { status: 400 });
  }

  const problems = findProblems(report, checks);
  await db.saveReport(report, problems);
  return Response.json({ ok: true, problems });
}
