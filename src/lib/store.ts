// Temporary in-memory report store until Supabase is connected.
// Lives on globalThis so dev hot-reloads keep the data; a server restart clears it.
import type { ReportInput } from "./report";

export interface StoredReport extends ReportInput {
  id: string;
  receivedAt: string; // ISO
  problems: string[];
}

const g = globalThis as unknown as { __twelveReports?: StoredReport[] };
const reports = (g.__twelveReports ??= []);

export function addReport(report: ReportInput, problems: string[], receivedAt = new Date()) {
  const stored: StoredReport = {
    ...report,
    id: crypto.randomUUID(),
    receivedAt: receivedAt.toISOString(),
    problems,
  };
  reports.push(stored);
  return stored;
}

export function listReports() {
  return reports;
}

export function clearReports() {
  reports.length = 0;
}
