// A realistic sample morning for demos: most rooms report, a few skip checks,
// a few never report. Dated today in the school's timezone.
import { findProblems, type ReportInput } from "./report";
import { addReport } from "./store";
import { addMinutes, localParts, zonedTime } from "./time";
import type { Check, Room, Schedule, Staff } from "./types";

const MISSING_ROUND1 = ["K-44", "K-29", "K-48"];
const MISSING_ROUND2 = ["K-44", "K-29", "K-48", "K-31", "K-16"];
const SKIPS: Record<string, string> = {
  "K-7": "whiteboard",
  "K-13": "seating",
  "K-22": "margin",
  "K-45": "highlighting",
};
const NON_ATTEMPTING: Record<string, number> = { "K-9": 2, "K-39": 1 };

export function seedSampleDay(input: {
  rooms: Room[];
  checks: Check[];
  staff: Staff[];
  schedule: Schedule;
  now?: Date;
}) {
  const { schedule, checks } = input;
  const { dateKey } = localParts(input.now ?? new Date(), schedule.timezone);
  const teachers = input.staff.filter((s) => s.role === "teacher");
  const incharges = input.staff.filter((s) => s.role === "floor_incharge");
  const testRooms = input.rooms.filter((r) => r.isTestRoom);
  let count = 0;

  const add = (report: ReportInput, hhmm: string) => {
    addReport(report, findProblems(report, checks), zonedTime(dateKey, hhmm, schedule.timezone));
    count++;
  };

  testRooms.forEach((room, i) => {
    const teacher = teachers[i % teachers.length];
    for (const round of [1, 2] as const) {
      if ((round === 1 ? MISSING_ROUND1 : MISSING_ROUND2).includes(room.code)) continue;
      const start = round === 1 ? schedule.startTime : schedule.round2Time;
      const hhmm = addMinutes(start, 1 + ((i * 7) % 12));
      const roundChecks = checks.filter((c) => c.round === round && c.audience !== "floor_incharge");
      const total = 35 + ((i * 5) % 9);
      const absent = i % 4;
      const na = NON_ATTEMPTING[room.code] ?? 0;
      add(
        {
          roomToken: room.token,
          staffId: teacher.id,
          role: "invigilator",
          round,
          arrivedAt: zonedTime(dateKey, addMinutes(hhmm, -1), schedule.timezone).toISOString(),
          answers: roundChecks.map((c) => ({
            checkId: c.id,
            result: SKIPS[room.code] === c.id ? "skipped" : "done",
            secondsOnCard: 9 + ((i + c.id.length) % 14),
          })),
          attendance: round === 1 ? { total, present: total - absent, absent, late: i % 3 } : undefined,
          nonAttempting:
            round === 2 ? { count: na, names: na ? ["Student A", "Student B"].slice(0, na).join(", ") : "" } : undefined,
        },
        hhmm,
      );
    }
  });

  // floor incharge rounds
  const fiVisits: [string, number, boolean][] = [
    ["K-5", 0, true],
    ["K-40", 1, false],
    ["K-23", 2, true],
  ];
  for (const [code, who, informed] of fiVisits) {
    const room = testRooms.find((r) => r.code === code);
    if (!room) continue;
    const fiChecks = checks.filter((c) => c.round === 2 && c.audience !== "invigilator");
    add(
      {
        roomToken: room.token,
        staffId: incharges[who % incharges.length].id,
        role: "floor_incharge",
        round: 2,
        arrivedAt: zonedTime(dateKey, "08:19", schedule.timezone).toISOString(),
        answers: fiChecks.map((c) => ({
          checkId: c.id,
          result: c.id === "lagging" && !informed ? "skipped" : "done",
          secondsOnCard: 11,
        })),
      },
      addMinutes("08:20", who * 3),
    );
  }
  return count;
}
