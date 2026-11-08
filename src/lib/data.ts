// Data access. Reads local sample data for now; swaps to Supabase later
// without changing the pages that call it.
import { checks, rooms, schedule, staff } from "./sample-data";
import type { Round } from "./types";

export function getRoomByToken(token: string) {
  return rooms.find((r) => r.token === token) ?? null;
}

export function getChecks() {
  return checks;
}

export function getStaff() {
  return staff;
}

export function getSchedule() {
  return schedule;
}

export function getTestRooms() {
  return rooms.filter((r) => r.isTestRoom);
}

export function getRooms() {
  return rooms;
}

// Round 2 starts at schedule.round2Time in the school's timezone.
export function currentRound(now: Date = new Date()): Round {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: schedule.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return hhmm >= schedule.round2Time ? 2 : 1;
}
