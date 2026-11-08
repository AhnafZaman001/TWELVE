// Builds the principal's live board from today's reports. Pure: no I/O.
import type { StoredReport } from "./report";
import { addMinutes, localParts } from "./time";
import type { Check, Room, Round, Schedule, Staff } from "./types";

export type RoundStatus = "upcoming" | "waiting" | "ok" | "problem" | "missing";

export interface BoardReport {
  id: string;
  time: string; // HH:MM local
  round: Round;
  role: StoredReport["role"];
  staffName: string;
  problems: string[];
  answers: { question: string; result: "done" | "skipped" }[];
  attendance?: StoredReport["attendance"];
  nonAttempting?: StoredReport["nonAttempting"];
}

export interface BoardRoom {
  token: string;
  code: string;
  section: string;
  year: 1 | 2;
  rounds: Record<Round, RoundStatus>;
  reports: BoardReport[];
}

export interface BoardAlert {
  id: string;
  time: string;
  kind: "problem" | "missing";
  title: string;
  detail: string[];
}

export interface Board {
  dateKey: string;
  clock: string;
  activeRound: Round | null;
  schedule: Schedule;
  rooms: BoardRoom[];
  alerts: BoardAlert[];
  summary: { total: number; round1: number; round2: number; problems: number; missing: number };
}

export function buildBoard(input: {
  rooms: Room[];
  reports: StoredReport[];
  checks: Check[];
  staff: Staff[];
  schedule: Schedule;
  now: Date;
  clockOverride?: string; // "HH:MM" for demos
}): Board {
  const { schedule } = input;
  const today = localParts(input.now, schedule.timezone);
  const clock = input.clockOverride ?? today.hhmm;
  const starts: Record<Round, string> = { 1: schedule.startTime, 2: schedule.round2Time };
  const deadline = (r: Round) => addMinutes(starts[r], schedule.bufferMinutes);

  const todays = input.reports.filter(
    (r) => localParts(new Date(r.receivedAt), schedule.timezone).dateKey === today.dateKey,
  );
  const staffName = (id: string) => input.staff.find((s) => s.id === id)?.name ?? "Unknown";
  const question = (id: string) => input.checks.find((c) => c.id === id)?.question ?? id;
  const time = (r: StoredReport) => localParts(new Date(r.receivedAt), schedule.timezone).hhmm;

  const rooms: BoardRoom[] = input.rooms
    .filter((room) => room.isTestRoom && room.section)
    .map((room) => {
      const mine = todays.filter((r) => r.roomToken === room.token);
      const status = (round: Round): RoundStatus => {
        const inRound = mine.filter((r) => r.round === round);
        if (inRound.some((r) => r.problems.length > 0)) return "problem";
        if (inRound.some((r) => r.role === "invigilator")) return "ok";
        if (clock >= deadline(round)) return "missing";
        if (clock >= starts[round]) return "waiting";
        return "upcoming";
      };
      return {
        token: room.token,
        code: room.code,
        section: room.section!,
        year: room.section!.startsWith("F") ? 1 : 2,
        rounds: { 1: status(1), 2: status(2) },
        reports: mine
          .map((r) => ({
            id: r.id,
            time: time(r),
            round: r.round,
            role: r.role,
            staffName: staffName(r.staffId),
            problems: r.problems,
            answers: r.answers.map((a) => ({ question: question(a.checkId), result: a.result })),
            attendance: r.attendance,
            nonAttempting: r.nonAttempting,
          }))
          .sort((a, b) => a.time.localeCompare(b.time)),
      };
    });

  const label = (r: BoardRoom) => `${r.code} · ${r.section}`;
  const alerts: BoardAlert[] = [];
  for (const room of rooms) {
    for (const rep of room.reports) {
      if (rep.problems.length === 0) continue;
      alerts.push({
        id: rep.id,
        time: rep.time,
        kind: "problem",
        title: `${label(room)} · Round ${rep.round}`,
        detail: [`${rep.staffName} (${rep.role === "invigilator" ? "Invigilator" : "Floor incharge"})`, ...rep.problems],
      });
    }
  }
  for (const round of [1, 2] as const) {
    const missing = rooms.filter((r) => r.rounds[round] === "missing");
    if (missing.length === 0) continue;
    alerts.push({
      id: `missing-${round}`,
      time: deadline(round),
      kind: "missing",
      title: `No report from ${missing.length} room${missing.length > 1 ? "s" : ""} · Round ${round}`,
      detail: [missing.map(label).join(", ")],
    });
  }
  alerts.sort((a, b) => b.time.localeCompare(a.time));

  const reported = (round: Round) =>
    rooms.filter((r) => r.rounds[round] === "ok" || r.rounds[round] === "problem").length;

  return {
    dateKey: today.dateKey,
    clock,
    activeRound: clock >= starts[2] ? 2 : clock >= starts[1] ? 1 : null,
    schedule,
    rooms,
    alerts,
    summary: {
      total: rooms.length,
      round1: reported(1),
      round2: reported(2),
      problems: alerts.filter((a) => a.kind === "problem").length,
      missing: new Set(
        rooms.filter((r) => r.rounds[1] === "missing" || r.rounds[2] === "missing").map((r) => r.token),
      ).size,
    },
  };
}
