import type { ReportInput, StoredReport } from "../report";
import type { Check, Room, Schedule, Staff } from "../types";

// What the app needs from storage. Two implementations: in-memory sample
// data (no keys set) and Supabase.
export interface Backend {
  name: "memory" | "supabase";
  getSchedule(): Promise<Schedule>;
  getRooms(): Promise<Room[]>;
  getRoomByToken(token: string): Promise<Room | null>;
  getChecks(): Promise<Check[]>;
  getStaff(): Promise<Staff[]>;
  saveReport(report: ReportInput, problems: string[], receivedAt?: Date): Promise<void>;
  listReports(dateKey: string): Promise<StoredReport[]>;
  clearReports(dateKey: string): Promise<void>;
}
