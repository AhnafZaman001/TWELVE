import type { EntityInput } from "../entities";
import type { StoredReport } from "../report";
import type { Entities, EntityKind, Room, School, Setup } from "../types";

export type NewReport = Omit<StoredReport, "id" | "receivedAt"> & { receivedAt?: Date };

// What the app needs from storage. Two implementations: in-memory sample
// data (no keys set) and Supabase.
export interface Backend {
  name: "memory" | "supabase";
  getSetup(): Promise<Setup>;
  getRoomByToken(token: string): Promise<Room | null>;

  saveSchool(school: School): Promise<School>;
  upsert<K extends EntityKind>(kind: K, row: EntityInput<K>): Promise<Entities[K]>;
  remove(kind: EntityKind, id: string): Promise<void>;
  newRoomToken(roomId: string): Promise<Room>;

  saveReport(report: NewReport): Promise<void>;
  listReports(dateKey: string): Promise<StoredReport[]>;
  clearReports(dateKey: string): Promise<void>;
}
