import { getChecks, getRoomByToken } from "@/lib/data";
import { findProblems, reportSchema } from "@/lib/report";
import { addReport } from "@/lib/store";

// Until Supabase is connected, reports are kept in server memory.
export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid report" }, { status: 400 });
  }
  const report = parsed.data;
  const room = getRoomByToken(report.roomToken);
  if (!room) {
    return Response.json({ ok: false, error: "Unknown room" }, { status: 404 });
  }

  const problems = findProblems(report, getChecks());
  addReport(report, problems);
  return Response.json({ ok: true, problems });
}
