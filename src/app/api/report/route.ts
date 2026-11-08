import { getBackend } from "@/lib/data";
import { prepareReport } from "@/lib/record";
import { reportSchema } from "@/lib/report";

export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid report" }, { status: 400 });
  }
  const db = await getBackend();
  const prepared = prepareReport(await db.getSetup(), parsed.data);
  if (!prepared.ok) {
    return Response.json({ ok: false, error: prepared.error }, { status: prepared.status });
  }
  await db.saveReport(prepared.value);
  return Response.json({ ok: true, problems: prepared.value.problems });
}
