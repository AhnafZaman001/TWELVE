import { z } from "zod";
import { checkReferences } from "@/lib/admin";
import { requireAccess } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { planStaffImport } from "@/lib/staff-import";

// POST { text, apply }: apply=false previews what would change; apply=true saves it.
// People already on the list (same email, or same name) are updated, not duplicated.
export async function POST(request: Request) {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const body = z.object({ text: z.string().max(200_000), apply: z.boolean() }).safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) return Response.json({ ok: false, error: "Paste the staff list first" }, { status: 400 });

  const db = await getBackend();
  const setup = await db.getSetup();
  const plan = planStaffImport(body.data.text, setup.staff);
  for (const row of [...plan.add, ...plan.update]) {
    const problem = checkReferences("staff", row, setup);
    if (problem) plan.errors.push(`${row.name}: ${problem}`);
  }
  const summary = {
    add: plan.add.map((r) => r.name),
    update: plan.update.map((r) => r.name),
    errors: plan.errors,
  };
  if (!body.data.apply || plan.errors.length) return Response.json({ ok: true, applied: false, ...summary });

  for (const row of [...plan.add, ...plan.update]) await db.upsert("staff", row);
  return Response.json({ ok: true, applied: true, ...summary });
}
