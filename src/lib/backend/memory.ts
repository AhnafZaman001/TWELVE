// In-memory backend: sample data, reports kept on globalThis so dev
// hot-reloads keep them. A server restart clears everything.
import type { StoredReport } from "../report";
import { checks, rooms, schedule, staff } from "../sample-data";
import { localParts } from "../time";
import type { Backend } from "./types";

const g = globalThis as unknown as { __twelveReports?: StoredReport[] };
const reports = (g.__twelveReports ??= []);
const dayOf = (r: StoredReport) => localParts(new Date(r.receivedAt), schedule.timezone).dateKey;

export const memoryBackend: Backend = {
  name: "memory",
  getSchedule: async () => schedule,
  getRooms: async () => rooms,
  getRoomByToken: async (token) => rooms.find((r) => r.token === token) ?? null,
  getChecks: async () => checks,
  getStaff: async () => staff,

  async saveReport(report, problems, receivedAt = new Date()) {
    reports.push({ ...report, id: crypto.randomUUID(), receivedAt: receivedAt.toISOString(), problems });
  },

  listReports: async (dateKey) => reports.filter((r) => dayOf(r) === dateKey),

  async clearReports(dateKey) {
    const keep = reports.filter((r) => dayOf(r) !== dateKey);
    reports.length = 0;
    reports.push(...keep);
  },
};
