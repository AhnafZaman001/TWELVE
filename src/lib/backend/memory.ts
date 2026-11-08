// In-memory backend: starts from sample data and supports every edit, kept on
// globalThis so dev hot-reloads keep changes. A server restart resets it.
import { newToken } from "../entities";
import type { StoredReport } from "../report";
import { sampleSetup } from "../sample-data";
import { localParts } from "../time";
import type { Entities, EntityKind, Setup } from "../types";
import type { Backend } from "./types";

const g = globalThis as unknown as { __twelve?: { setup: Setup; reports: StoredReport[] } };
const state = (g.__twelve ??= { setup: sampleSetup(), reports: [] });
const dayOf = (r: StoredReport) => localParts(new Date(r.receivedAt), state.setup.school.timezone).dateKey;
const list = <K extends EntityKind>(kind: K) => state.setup[kind] as Entities[K][];

export const memoryBackend: Backend = {
  name: "memory",
  getSetup: async () => structuredClone(state.setup),
  getRoomByToken: async (token) => state.setup.rooms.find((r) => r.token === token && r.active) ?? null,

  async saveSchool(school) {
    state.setup.school = { ...school };
    return school;
  },

  async upsert(kind, row) {
    const rows = list(kind);
    if (row.id) {
      const i = rows.findIndex((r) => r.id === row.id);
      if (i < 0) throw new Error("Not found");
      rows[i] = { ...rows[i], ...row } as Entities[typeof kind];
      return rows[i];
    }
    const created = {
      ...row,
      id: crypto.randomUUID(),
      ...(kind === "rooms" ? { token: newToken(), qrIssuedAt: new Date().toISOString() } : {}),
    } as unknown as Entities[typeof kind];
    rows.push(created);
    return created;
  },

  async remove(kind, id) {
    const s = state.setup;
    const rows = s[kind] as { id: string }[];
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
    // same effects as the database's foreign keys
    if (kind === "groups") s.sections.forEach((x) => x.groupId === id && (x.groupId = null));
    if (kind === "rooms") s.sections.forEach((x) => x.roomId === id && (x.roomId = null));
    if (kind === "rounds") s.checks = s.checks.filter((c) => c.roundId !== id);
  },

  async renewQr(roomIds) {
    const now = new Date().toISOString();
    const rooms = state.setup.rooms.filter((r) => roomIds.includes(r.id));
    for (const room of rooms) {
      room.token = newToken();
      room.qrIssuedAt = now;
    }
    return rooms;
  },

  async saveReport({ receivedAt = new Date(), ...report }) {
    state.reports.push({ ...report, id: crypto.randomUUID(), receivedAt: receivedAt.toISOString() });
  },

  listReports: async (dateKey) => state.reports.filter((r) => dayOf(r) === dateKey),

  async clearReports(dateKey) {
    state.reports = state.reports.filter((r) => dayOf(r) !== dateKey);
  },
};
