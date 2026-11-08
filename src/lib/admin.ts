// Server-side checks for admin edits that need the rest of the setup,
// e.g. a section's room must exist. Field-level rules live in entities.ts.
import type { EntityInput } from "./entities";
import type { EntityKind, Setup } from "./types";

export function checkDelete(kind: EntityKind, id: string, setup: Setup): string | null {
  if (kind === "admins") {
    const owners = setup.admins.filter((a) => a.role === "owner");
    if (owners.length === 1 && owners[0].id === id) return "Keep at least one owner";
  }
  return null;
}

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
  if (kind === "admins") {
    const a = row as EntityInput<"admins">;
    const taken = setup.admins.find((x) => x.email === a.email && x.id !== a.id);
    if (taken) return "That email is already an admin";
    const wasOwner = setup.admins.find((x) => x.id === a.id)?.role === "owner";
    if (wasOwner && a.role !== "owner" && setup.admins.filter((x) => x.role === "owner").length === 1) {
      return "Keep at least one owner";
    }
  }
  if (kind === "staff") {
    const s = row as EntityInput<"staff">;
    const taken = s.email && setup.staff.find((x) => x.email === s.email && x.id !== s.id);
    if (taken) return `That email belongs to ${taken.name}`;
  }
  if (kind === "checks") {
    const c = row as EntityInput<"checks">;
    if (!setup.rounds.some((r) => r.id === c.roundId)) return "That round no longer exists";
  }
  return null;
}
