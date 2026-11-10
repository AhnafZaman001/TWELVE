import { emailMissingReports } from "@/lib/alerts";
import { buildBoard } from "@/lib/board";
import { getBackend, listSchools } from "@/lib/data";
import { localParts } from "@/lib/time";

// Called every few minutes (Supabase pg_cron, see supabase/migrations/0006).
// For every school, on its test days, once a round's deadline has passed it
// e-mails the sections that have not reported. The alert log makes each
// round's e-mail go out at most once a day, so calling this often is harmless.
export async function GET() {
  const now = new Date();
  const result: Record<string, string[]> = {};

  for (const slug of await listSchools()) {
    const db = await getBackend(slug);
    const setup = await db.getSetup();
    const tz = setup.school.timezone;
    const weekday = isoWeekday(now, tz);
    const sent: string[] = (result[slug ?? "sample"] = []);
    if (!setup.school.testWeekdays.includes(weekday)) continue;

    const { dateKey } = localParts(now, tz);
    const board = buildBoard({ setup, reports: await db.listReports(dateKey), now });
    for (const round of board.rounds) {
      if (board.clock < round.deadline) continue;
      const missing = board.sections
        .filter((s) => s.status[round.id] === "missing")
        .map((s) => `${s.roomCode} · ${s.name}`);
      if (missing.length === 0) continue;
      if (!(await db.logAlertOnce(dateKey, `missing:${round.id}`))) continue;
      const out = await emailMissingReports(setup, round.name, round.deadline, missing);
      if (!out.sent) {
        await db.forgetAlert(dateKey, `missing:${round.id}`); // try again on the next run
        continue;
      }
      sent.push(round.name);
    }
  }
  return Response.json({ ok: true, sent: result });
}

// 1 = Monday … 7 = Sunday, in the school's timezone
function isoWeekday(date: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day) + 1;
}
