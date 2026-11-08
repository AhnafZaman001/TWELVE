import { checkReferences } from "@/lib/admin";
import { getBackend } from "@/lib/data";
import { entitySchemas } from "@/lib/entities";
import { blockInProduction } from "@/lib/guard";
import { ENTITY_KINDS, type EntityKind } from "@/lib/types";

// POST /api/admin/<kind>          add (no id) or edit (with id)
// DELETE /api/admin/<kind>?id=…   delete
function kindOf(value: string): EntityKind | null {
  return (ENTITY_KINDS as string[]).includes(value) ? (value as EntityKind) : null;
}

const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });

export async function POST(request: Request, ctx: RouteContext<"/api/admin/[kind]">) {
  const blocked = blockInProduction();
  if (blocked) return blocked;
  const kind = kindOf((await ctx.params).kind);
  if (!kind) return fail("Unknown list", 404);

  const parsed = entitySchemas[kind].safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue ? `${issue.path.join(".") || "Value"}: ${issue.message}` : "Invalid");
  }
  const db = await getBackend();
  const problem = checkReferences(kind, parsed.data, await db.getSetup());
  if (problem) return fail(problem);

  try {
    return Response.json({ ok: true, row: await db.upsert(kind, parsed.data) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not save", 500);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/[kind]">) {
  const blocked = blockInProduction();
  if (blocked) return blocked;
  const kind = kindOf((await ctx.params).kind);
  const id = new URL(request.url).searchParams.get("id");
  if (!kind || !id) return fail("Unknown item", 404);
  try {
    await (await getBackend()).remove(kind, id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not delete", 500);
  }
}
