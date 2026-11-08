import { authEnabled, getViewer } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { prepareReport } from "@/lib/record";
import { reportSchema } from "@/lib/report";

export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid report" }, { status: 400 });
  }
  const db = await getBackend();
  const setup = await db.getSetup();
  let report = parsed.data;

  // With sign-in on, the reporter is whoever is signed in, whatever the phone sent.
  if (authEnabled) {
    const viewer = await getViewer(setup);
    if (!viewer) return Response.json({ ok: false, error: "Please sign in" }, { status: 401 });
    if (!viewer.staff) return Response.json({ ok: false, error: "Not on the staff list" }, { status: 403 });
    report = {
      ...report,
      staffId: viewer.staff.id,
      role: viewer.staff.role === "floor_incharge" ? "floor_incharge" : "invigilator",
    };
  }

  const prepared = prepareReport(setup, report);
  if (!prepared.ok) {
    return Response.json({ ok: false, error: prepared.error }, { status: prepared.status });
  }
  await db.saveReport(prepared.value);
  return Response.json({ ok: true, problems: prepared.value.problems });
}
