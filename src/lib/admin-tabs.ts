// The admin screen's tabs and their #links, shared by the top bar and the
// admin screen itself. /admin#rooms, /admin#qr-codes, … (older links like
// #groups or #checks still land in the right place).
export const ADMIN_TABS = ["Rooms", "Test", "People", "QR codes", "Settings"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];
export type AdminView = "Staff" | "Admins" | null;

const LINKS: Record<string, [AdminTab, AdminView]> = {
  rooms: ["Rooms", null],
  classes: ["Rooms", null],
  sections: ["Rooms", null],
  groups: ["Rooms", null],
  test: ["Test", null],
  rounds: ["Test", null],
  checks: ["Test", null],
  people: ["People", "Staff"],
  staff: ["People", "Staff"],
  admins: ["People", "Admins"],
  "qr-codes": ["QR codes", null],
  settings: ["Settings", null],
  school: ["Settings", null],
};

export function placeFromHash(hash: string): [AdminTab, AdminView] {
  return LINKS[hash.replace(/^#/, "")] ?? ["Rooms", null];
}

// The #link for a tab (and sub-view): Classes → "classes", Rooms → "rooms"
export function hashFor(tab: AdminTab, view: AdminView = null) {
  const wanted = view ?? (tab === "People" ? "Staff" : null);
  return Object.entries(LINKS).find(([, [t, v]]) => t === tab && v === wanted)?.[0] ?? "rooms";
}

// Subscribe to the URL #hash (for useSyncExternalStore)
export function onHashChange(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
