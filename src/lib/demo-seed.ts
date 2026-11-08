// A realistic sample morning for demos, built from whatever the school's setup
// is: most sections report in every round, a few skip one check, a few never
// report, and floor incharges visit some rooms. Dated today.
import type { NewReport } from "./backend/types";
import { prepareReport } from "./record";
import type { ReportInput } from "./report";
import { roundsByTime } from "./setup";
import { addMinutes, localParts, zonedTime } from "./time";
import type { Setup } from "./types";

export function sampleDay(setup: Setup, now = new Date()): NewReport[] {
  const tz = setup.school.timezone;
  const { dateKey } = localParts(now, tz);
  const teachers = setup.staff.filter((s) => s.active && s.role === "teacher");
  const incharges = setup.staff.filter((s) => s.active && s.role === "floor_incharge");
  const rounds = roundsByTime(setup.rounds);
  const placed = setup.sections
    .filter((s) => s.active && s.roomId)
    .sort((a, b) => a.sort - b.sort)
    .map((sec) => ({ sec, room: setup.rooms.find((r) => r.id === sec.roomId && r.active) }))
    .filter((x): x is { sec: typeof x.sec; room: NonNullable<typeof x.room> } => Boolean(x.room));
  if (!teachers.length || !rounds.length) return [];

  const out: NewReport[] = [];
  const add = (report: ReportInput, hhmm: string) => {
    const p = prepareReport(setup, report, zonedTime(dateKey, hhmm, tz));
    if (p.ok) out.push(p.value);
  };

  placed.forEach(({ room }, i) => {
    rounds.forEach((round, ri) => {
      // every 11th section never reports; later rounds lose a couple more
      if (i % 11 === 10 || (ri > 0 && i % 13 === 6)) return;
      const hhmm = addMinutes(round.startTime, 1 + ((i * 7) % 12));
      const checks = setup.checks
        .filter((c) => c.active && c.roundId === round.id && c.audience !== "floor_incharge")
        .sort((a, b) => a.sort - b.sort);
      const skipIndex = i % 9 === 4 ? (i + ri) % Math.max(checks.length, 1) : -1;
      const total = 35 + ((i * 5) % 9);
      const absent = i % 4;
      const na = i % 15 === 8 ? 1 + (i % 2) : 0;
      add(
        {
          roomToken: room.token,
          staffId: teachers[i % teachers.length].id,
          role: "invigilator",
          roundId: round.id,
          arrivedAt: zonedTime(dateKey, addMinutes(hhmm, -1), tz).toISOString(),
          answers: checks.map((c, ci) => ({
            checkId: c.id,
            result: ci === skipIndex ? "skipped" : "done",
            secondsOnCard: 9 + ((i + ci) % 14),
          })),
          attendance:
            round.countsKind === "attendance" ? { total, present: total - absent, absent, late: i % 3 } : undefined,
          nonAttempting:
            round.countsKind === "non_attempting"
              ? { count: na, names: na ? ["Student A", "Student B"].slice(0, na).join(", ") : "" }
              : undefined,
        },
        hhmm,
      );
    });
  });

  // floor incharge visits in the last round
  const last = rounds.at(-1)!;
  const fiChecks = setup.checks.filter((c) => c.active && c.roundId === last.id && c.audience !== "invigilator");
  incharges.forEach((fi, k) => {
    const target = placed[(k * 7 + 3) % Math.max(placed.length, 1)];
    if (!target) return;
    add(
      {
        roomToken: target.room.token,
        staffId: fi.id,
        role: "floor_incharge",
        roundId: last.id,
        arrivedAt: zonedTime(dateKey, addMinutes(last.startTime, 3 + k * 3), tz).toISOString(),
        answers: fiChecks.map((c, ci) => ({
          checkId: c.id,
          result: k === 1 && ci === fiChecks.length - 1 ? "skipped" : "done",
          secondsOnCard: 11,
        })),
      },
      addMinutes(last.startTime, 4 + k * 3),
    );
  });
  return out;
}
