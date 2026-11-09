import { authEnabled, getViewer, requireAccess } from "@/lib/auth";
import { after } from "next/server";
import { emailProblemReport } from "@/lib/alerts";
import { getBackend } from "@/lib/data";
import { prepareReport } from "@/lib/record";
import { findProblems, reportSchema } from "@/lib/report";

export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid report" }, { status: 400 });
  }
  // A deployed site without Supabase keys has no sign-in: accept nothing.
  if (!authEnabled && process.env.NODE_ENV === "production") {
    return Response.json({ ok: false, error: "Sign-in is not set up" }, { status: 403 });
  }
  const db = await getBackend();
  const setup = await db.getSetup();
  let report = parsed.data;

  // Admin preview: show what would be flagged, save nothing.
  if (new URL(request.url).searchParams.get("preview") === "1") {
    const blocked = await requireAccess("board");
    if (blocked) return blocked;
    return Response.json({ ok: true, preview: true, problems: findProblems(report, setup.checks) });
  }

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
  if (prepared.value.problems.length) {
    const report = prepared.value;
    after(() => emailProblemReport(setup, report).catch((e) => console.error("Alert e-mail:", e)));
  }
  return Response.json({ ok: true, problems: prepared.value.problems });
}
