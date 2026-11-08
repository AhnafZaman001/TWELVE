// Turns a teacher's submission into a report ready to save: checks it against
// the school's setup, finds problems, and copies names for history.
import type { NewReport } from "./backend/types";
import { findProblems, type ReportInput } from "./report";
import { sectionInRoom } from "./setup";
import type { Setup } from "./types";

export function prepareReport(
  setup: Setup,
  report: ReportInput,
  receivedAt?: Date,
): { ok: true; value: NewReport } | { ok: false; error: string; status: number } {
  const room = setup.rooms.find((r) => r.token === report.roomToken && r.active);
  if (!room) return { ok: false, error: "Unknown room", status: 404 };
  const staff = setup.staff.find((s) => s.id === report.staffId && s.active);
  if (!staff) return { ok: false, error: "Unknown staff member", status: 400 };
  const round = setup.rounds.find((r) => r.id === report.roundId);
  if (!round) return { ok: false, error: "Unknown round", status: 400 };

  const section = sectionInRoom(setup, room.id);
  const questions: Record<string, string> = {};
  for (const a of report.answers) {
    const check = setup.checks.find((c) => c.id === a.checkId);
    if (!check) return { ok: false, error: "Unknown check", status: 400 };
    questions[a.checkId] = check.question;
  }

  return {
    ok: true,
    value: {
      ...report,
      roomId: room.id,
      roomCode: room.code,
      sectionId: section?.id ?? null,
      sectionName: section?.name ?? null,
      staffName: staff.name,
      roundName: round.name,
      questions,
      problems: findProblems(report, setup.checks),
      receivedAt,
    },
  };
}
