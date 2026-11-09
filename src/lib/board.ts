// Builds the principal's live board from today's reports. Pure: no I/O.
// Works for any number of rounds, groups and sections.
import { roundsByTime } from "./setup";
import type { StoredReport } from "./report";
import { addMinutes, localParts } from "./time";
import type { Group, Setup } from "./types";

export type RoundStatus = "upcoming" | "waiting" | "ok" | "problem" | "missing";

export interface BoardReport {
  id: string;
  time: string; // HH:MM local
  roundId: string;
  roundName: string;
  role: StoredReport["role"];
  staffName: string;
  problems: string[];
  answers: { question: string; result: "done" | "skipped" }[];
  attendance?: StoredReport["attendance"];
  nonAttempting?: StoredReport["nonAttempting"];
}

export interface BoardSection {
  id: string;
  name: string;
  roomCode: string;
  groupId: string | null;
  status: Record<string, RoundStatus>; // by round id
  reports: BoardReport[];
}

export interface BoardRound {
  id: string;
  name: string;
  startTime: string;
  deadline: string;
}

export type BoardAlert =
  | {
      kind: "problem";
      id: string;
      time: string;
      place: string; // "K-4 · F-1A"
      roundName: string;
      who: string;
      role: StoredReport["role"];
      items: string[]; // what went wrong
    }
  | {
      kind: "missing";
      id: string;
      time: string; // the round's deadline
      roundName: string;
      sections: string[]; // "K-4 · F-1A"
    };

export interface Board {
  dateKey: string;
  clock: string;
  phase: "before" | "during" | "after";
  activeRoundId: string | null;
  schoolName: string;
  endTime: string;
  rounds: BoardRound[];
  groups: Group[];
  sections: BoardSection[];
  alerts: BoardAlert[];
  summary: { total: number; reported: Record<string, number>; problems: number; missing: number };
}

export function buildBoard(input: {
  setup: Setup;
  reports: StoredReport[];
  now: Date;
  clockOverride?: string; // "HH:MM" for demos
}): Board {
  const { setup } = input;
  const tz = setup.school.timezone;
  const today = localParts(input.now, tz);
  const clock = input.clockOverride ?? today.hhmm;
  const rounds: BoardRound[] = roundsByTime(setup.rounds).map((r) => ({
    id: r.id,
    name: r.name,
    startTime: r.startTime,
    deadline: addMinutes(r.startTime, setup.school.bufferMinutes),
  }));
  const todays = input.reports.filter((r) => localParts(new Date(r.receivedAt), tz).dateKey === today.dateKey);
  const roomCode = (id: string | null) => setup.rooms.find((r) => r.id === id)?.code ?? "No room";

  const sections: BoardSection[] = setup.sections
    .filter((s) => s.active && s.roomId)
    .sort((a, b) => a.sort - b.sort)
    .map((sec) => {
      const mine = todays.filter((r) => (r.sectionId ? r.sectionId === sec.id : r.roomId === sec.roomId));
      const status: Record<string, RoundStatus> = {};
      for (const round of rounds) {
        const inRound = mine.filter((r) => r.roundId === round.id);
        status[round.id] = inRound.some((r) => r.problems.length > 0)
          ? "problem"
          : inRound.some((r) => r.role === "invigilator")
            ? "ok"
            : clock >= round.deadline
              ? "missing"
              : clock >= round.startTime
                ? "waiting"
                : "upcoming";
      }
      return {
        id: sec.id,
        name: sec.name,
        roomCode: roomCode(sec.roomId),
        groupId: sec.groupId,
        status,
        reports: mine
          .map((r) => ({
            id: r.id,
            time: localParts(new Date(r.receivedAt), tz).hhmm,
            roundId: r.roundId,
            roundName: r.roundName,
            role: r.role,
            staffName: r.staffName,
            problems: r.problems,
            answers: r.answers.map((a) => ({ question: r.questions[a.checkId] ?? a.checkId, result: a.result })),
            attendance: r.attendance,
            nonAttempting: r.nonAttempting,
          }))
          .sort((a, b) => a.time.localeCompare(b.time)),
      };
    });

  const label = (s: BoardSection) => `${s.roomCode} · ${s.name}`;
  const alerts: BoardAlert[] = [];
  for (const sec of sections) {
    for (const rep of sec.reports) {
      if (rep.problems.length === 0) continue;
      alerts.push({
        kind: "problem",
        id: rep.id,
        time: rep.time,
        place: label(sec),
        roundName: rep.roundName,
        who: rep.staffName,
        role: rep.role,
        items: rep.problems,
      });
    }
  }
  for (const round of rounds) {
    const missing = sections.filter((s) => s.status[round.id] === "missing");
    if (missing.length === 0) continue;
    alerts.push({
      kind: "missing",
      id: `missing-${round.id}`,
      time: round.deadline,
      roundName: round.name,
      sections: missing.map(label),
    });
  }
  alerts.sort((a, b) => b.time.localeCompare(a.time));

  const started = rounds.filter((r) => r.startTime <= clock);
  return {
    dateKey: today.dateKey,
    clock,
    phase: started.length === 0 ? "before" : clock >= setup.school.endTime ? "after" : "during",
    activeRoundId: started.at(-1)?.id ?? null,
    schoolName: setup.school.name,
    endTime: setup.school.endTime,
    rounds,
    groups: [...setup.groups].sort((a, b) => a.sort - b.sort),
    sections,
    alerts,
    summary: {
      total: sections.length,
      reported: Object.fromEntries(
        rounds.map((r) => [r.id, sections.filter((s) => ["ok", "problem"].includes(s.status[r.id])).length]),
      ),
      problems: alerts.filter((a) => a.kind === "problem").length,
      missing: sections.filter((s) => Object.values(s.status).includes("missing")).length,
    },
  };
}
