import { getChecks, getRoomByToken } from "@/lib/data";
import { findProblems, reportSchema } from "@/lib/report";

// Until Supabase is connected, reports are only logged on the server.
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
  console.log(`[report] ${room.code} round ${report.round} by ${report.staffId}`, problems);
  return Response.json({ ok: true, problems });
}
