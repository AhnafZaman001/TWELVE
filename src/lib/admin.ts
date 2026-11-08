// Server-side checks for admin edits that need the rest of the setup,
// e.g. a section's room must exist. Field-level rules live in entities.ts.
import type { EntityInput } from "./entities";
import type { EntityKind, Setup } from "./types";

export function checkReferences<K extends EntityKind>(kind: K, row: EntityInput<K>, setup: Setup): string | null {
  if (kind === "sections") {
    const s = row as EntityInput<"sections">;
    if (s.groupId && !setup.groups.some((g) => g.id === s.groupId)) return "That group no longer exists";
    if (s.roomId && !setup.rooms.some((r) => r.id === s.roomId)) return "That room no longer exists";
    if (s.roomId && s.active) {
      const taken = setup.sections.find((x) => x.roomId === s.roomId && x.active && x.id !== s.id);
      if (taken) return `That room already has section ${taken.name}. Move or deactivate it first.`;
    }
  }
  if (kind === "checks") {
    const c = row as EntityInput<"checks">;
    if (!setup.rounds.some((r) => r.id === c.roundId)) return "That round no longer exists";
  }
  return null;
}
