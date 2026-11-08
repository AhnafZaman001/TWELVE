// Helpers over a school's setup. Pure: safe on server and client.
import { localParts } from "./time";
import type { Round, Setup } from "./types";

export function roundsByTime(rounds: Round[]) {
  return [...rounds].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sort - b.sort);
}

// The latest round that has started; before the first one, the first round.
export function currentRound(setup: Setup, now: Date = new Date()): Round | null {
  const ordered = roundsByTime(setup.rounds);
  const hhmm = localParts(now, setup.school.timezone).hhmm;
  return ordered.filter((r) => r.startTime <= hhmm).at(-1) ?? ordered[0] ?? null;
}

// The active section placed in a room (a room can be empty).
export function sectionInRoom(setup: Setup, roomId: string) {
  return setup.sections.find((s) => s.roomId === roomId && s.active) ?? null;
}
