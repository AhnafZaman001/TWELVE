// Which rooms' QR codes to renew. Renewing makes a new secret link; the old
// printed QR stops working, so renewed rooms need their card reprinted.
import type { Setup } from "./types";

export type RenewScope = { scope: "rooms"; roomIds: string[] } | { scope: "group"; groupId: string } | { scope: "all" };

export function roomsToRenew(setup: Setup, req: RenewScope): string[] {
  const active = setup.rooms.filter((r) => r.active);
  if (req.scope === "all") return active.map((r) => r.id);
  if (req.scope === "rooms") return active.filter((r) => req.roomIds.includes(r.id)).map((r) => r.id);
  const inGroup = new Set(
    setup.sections.filter((s) => s.active && s.groupId === req.groupId && s.roomId).map((s) => s.roomId),
  );
  return active.filter((r) => inGroup.has(r.id)).map((r) => r.id);
}

// Rooms whose QR is older than the school's auto-renew period.
export function roomsDueForRenewal(setup: Setup, now = new Date()): string[] {
  const days = setup.school.qrRotateDays;
  if (!days) return [];
  const cutoff = now.getTime() - days * 86_400_000;
  return setup.rooms.filter((r) => r.active && new Date(r.qrIssuedAt).getTime() <= cutoff).map((r) => r.id);
}

// Short code printed on each card so staff can tell an old print from the current one.
export function qrCodeLabel(token: string) {
  return token.slice(-4).toUpperCase();
}
