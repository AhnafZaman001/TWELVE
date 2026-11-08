import { z } from "zod";
import type { Check } from "./types";

const count = z.number().int().min(0).max(500);

export const reportSchema = z.object({
  roomToken: z.string().min(1),
  staffId: z.string().min(1),
  role: z.enum(["invigilator", "floor_incharge"]),
  roundId: z.string().min(1),
  arrivedAt: z.iso.datetime(),
  answers: z.array(
    z.object({
      checkId: z.string(),
      result: z.enum(["done", "skipped"]),
      secondsOnCard: z.number().min(0),
    }),
  ),
  attendance: z
    .object({ total: count, present: count, absent: count, late: count })
    .optional(),
  nonAttempting: z.object({ count, names: z.string().max(1000) }).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

// Names are copied into each saved report, so history stays readable even
// after a room, section, staff member, round or check is renamed or deleted.
export interface ReportSnapshot {
  roomCode: string;
  sectionId: string | null;
  sectionName: string | null;
  staffName: string;
  roundName: string;
  questions: Record<string, string>; // checkId -> question text at the time
}

export interface StoredReport extends ReportInput, ReportSnapshot {
  id: string;
  roomId: string | null;
  receivedAt: string; // ISO
  problems: string[];
}

// The server decides what is a problem, so the phone cannot hide an alert.
export function findProblems(report: ReportInput, checks: Check[]): string[] {
  const problems: string[] = [];
  for (const a of report.answers) {
    if (a.result === "skipped") {
      const check = checks.find((c) => c.id === a.checkId);
      problems.push(`Skipped: ${check?.question ?? a.checkId}`);
    }
  }
  const att = report.attendance;
  if (att && att.present + att.absent !== att.total) {
    problems.push(
      `Counts do not add up: present ${att.present} + absent ${att.absent} ≠ total ${att.total}`,
    );
  }
  const na = report.nonAttempting;
  if (na && na.count > 0) {
    problems.push(`Non-attempting students: ${na.count}${na.names ? ` (${na.names})` : ""}`);
  }
  return problems;
}
