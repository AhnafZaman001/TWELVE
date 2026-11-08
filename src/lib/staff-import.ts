// Reads a staff list pasted from Excel or Google Sheets: one person per line,
// columns Name, Email, Role (tab or comma separated; Email and Role optional).
import { entitySchemas, type EntityInput } from "./entities";
import type { Staff } from "./types";

export interface ImportPlan {
  add: EntityInput<"staff">[];
  update: EntityInput<"staff">[];
  errors: string[];
}

export function planStaffImport(text: string, existing: Staff[]): ImportPlan {
  const plan: ImportPlan = { add: [], update: [], errors: [] };
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  lines.forEach((line, i) => {
    const cols = line.split(line.includes("\t") ? "\t" : ",").map((c) => c.trim());
    const [name = "", email = "", roleText = ""] = cols;
    if (i === 0 && /^name$/i.test(name)) return; // header row
    const role = /floor|incharge/i.test(roleText) ? "floor_incharge" : "teacher";
    const match =
      (email && existing.find((s) => s.email === email.toLowerCase())) ||
      existing.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const parsed = entitySchemas.staff.safeParse({
      id: match?.id,
      name,
      email: email || match?.email || null,
      role: roleText ? role : (match?.role ?? role),
      active: true,
    });
    if (!parsed.success) {
      plan.errors.push(`Line ${i + 1} (${line}): ${parsed.error.issues[0]?.message ?? "invalid"}`);
      return;
    }
    const key = parsed.data.email ?? parsed.data.name.toLowerCase();
    if (seen.has(key)) {
      plan.errors.push(`Line ${i + 1}: ${name} appears twice`);
      return;
    }
    seen.add(key);
    (match ? plan.update : plan.add).push(parsed.data);
  });
  return plan;
}
