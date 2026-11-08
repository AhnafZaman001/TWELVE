// Everything here is data the school edits in the admin screen. Nothing about a
// particular school (rooms, sections, rounds, staff, checks) is fixed in code.

export type Role = "invigilator" | "floor_incharge";
export type StaffRole = "teacher" | "floor_incharge";
export type Audience = Role | "both";
export type CountsKind = "none" | "attendance" | "non_attempting";

export interface School {
  name: string;
  timezone: string;
  endTime: string; // "HH:MM" when the test period ends
  bufferMinutes: number; // a round is "missing" this long after it starts
  testWeekdays: number[]; // 1 = Monday … 7 = Sunday
}

export interface Group {
  id: string;
  name: string; // "1st Year"
  sort: number;
}

export interface Room {
  id: string;
  code: string; // "K-4"
  token: string; // secret in the QR link
  active: boolean;
  sort: number;
}

export interface Section {
  id: string;
  name: string; // "F-1A"
  groupId: string | null;
  roomId: string | null; // the room it sits in; null = not placed
  active: boolean;
  sort: number;
}

export interface Round {
  id: string;
  name: string; // "Start of test"
  startTime: string; // "HH:MM"
  countsKind: CountsKind; // what the invigilator fills in at the end
  sort: number;
}

export interface Check {
  id: string;
  roundId: string;
  audience: Audience;
  instruction: string;
  question: string;
  minSeconds: number;
  active: boolean;
  sort: number;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
}

export interface Setup {
  school: School;
  groups: Group[];
  rooms: Room[];
  sections: Section[];
  rounds: Round[];
  checks: Check[];
  staff: Staff[];
}

// Editable lists, keyed by name, for the generic admin API
export interface Entities {
  groups: Group;
  rooms: Room;
  sections: Section;
  rounds: Round;
  checks: Check;
  staff: Staff;
}
export type EntityKind = keyof Entities;
export const ENTITY_KINDS: EntityKind[] = ["groups", "rooms", "sections", "rounds", "checks", "staff"];
