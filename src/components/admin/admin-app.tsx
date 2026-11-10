"use client";

import { useCallback, useEffect, useState } from "react";
import type { Setup } from "@/lib/types";
import { EntityTable } from "./entity-table";
import { QrCodes } from "./qr-codes";
import { RoomsManager } from "./rooms-manager";
import { SchoolForm } from "./school-form";
import { SectionsManager } from "./sections-manager";
import { StaffManager } from "./staff-manager";
import { TestManager } from "./test-manager";
import { SubTabs } from "./tile-kit";

// Five tabs: Classes (groups, sections, rooms), Test (rounds and their
// checks), People (staff and admins), QR codes, Settings (school).
const TABS = ["Classes", "Test", "People", "QR codes", "Settings"] as const;
type Tab = (typeof TABS)[number];
const CLASS_VIEWS = ["Sections", "Rooms"] as const;
const PEOPLE_VIEWS = ["Staff", "Admins"] as const;
type View = (typeof CLASS_VIEWS)[number] | (typeof PEOPLE_VIEWS)[number] | null;

// /admin#rooms, #qr-codes … (old links to the earlier tabs still land in the right place)
const LINKS: Record<string, [Tab, View]> = {
  classes: ["Classes", "Sections"],
  sections: ["Classes", "Sections"],
  groups: ["Classes", "Sections"],
  rooms: ["Classes", "Rooms"],
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
const slugOf = (tab: Tab, view: View) =>
  Object.entries(LINKS).find(([, [t, v]]) => t === tab && v === view)?.[0] ?? "classes";

export function AdminApp() {
  const [setup, setSetup] = useState<(Setup & { backend?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the server renders "Loading…" either way, so reading the hash here is safe
  const [place, setPlace] = useState<[Tab, View]>(() => {
    const hash = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return LINKS[hash] ?? ["Classes", "Sections"];
  });
  const [tab, view] = place;
  const go = (t: Tab, v: View = null) => {
    const next: [Tab, View] = [t, v ?? (t === "Classes" ? "Sections" : t === "People" ? "Staff" : null)];
    setPlace(next);
    window.history.replaceState(null, "", `#${slugOf(...next)}`);
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/setup", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return setError(data?.error ?? "Could not load the setup");
    setError(null);
    setSetup(data);
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- initial fetch
  }, [load]);

  if (!setup) {
    return <main className="flex min-h-dvh items-center justify-center text-muted">{error ?? "Loading…"}</main>;
  }

  const admins = (
    <EntityTable
      kind="admins"
      title="Admins"
      hint="Who can sign in to the board and this screen. Owner and Admin can change everything; Coordinator sees the board only."
      rows={setup.admins}
      columns={[
        { key: "name", label: "Name", type: "text", wide: true },
        { key: "email", label: "Sign-in email", type: "text", wide: true },
        {
          key: "role",
          label: "Role",
          type: "select",
          options: [
            { value: "owner", label: "Owner" },
            { value: "admin", label: "Admin" },
            { value: "coordinator", label: "Coordinator" },
          ],
        },
        { key: "emailAlerts", label: "Alert e-mails", type: "bool" },
      ]}
      blank={() => ({ name: "", email: "", role: "admin", emailAlerts: true })}
      onChanged={load}
    />
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 print:block print:max-w-none print:p-0">
      <header className="flex flex-col gap-1 print:hidden">
        <p className="text-sm font-medium tracking-widest text-muted uppercase">TWELVE · Admin</p>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{setup.school.name}</h1>
          <button
            type="button"
            onClick={() => go("Settings")}
            className="min-h-8 rounded-lg border border-line px-2 text-xs font-medium text-muted hover:text-foreground"
          >
            Rename
          </button>
        </div>
        <p className={`text-xs ${setup.backend === "supabase" ? "text-accent" : "text-warn"}`}>
          {setup.backend === "supabase"
            ? "Changes are saved to Supabase"
            : "Sample data · changes reset when the server restarts"}
        </p>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line p-1 text-sm print:hidden" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => go(t)}
            className={`min-h-9 shrink-0 rounded-lg px-3 font-medium ${tab === t ? "bg-foreground text-background" : "text-muted"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {error && <p className="text-sm text-danger print:hidden">{error}</p>}

      {tab === "Classes" && (
        <>
          <SubTabs options={CLASS_VIEWS} value={view as (typeof CLASS_VIEWS)[number]} onChange={(v) => go("Classes", v)} />
          {view === "Rooms" ? <RoomsManager setup={setup} onChanged={load} /> : <SectionsManager setup={setup} onChanged={load} />}
        </>
      )}
      {tab === "Test" && <TestManager setup={setup} onChanged={load} />}
      {tab === "People" && (
        <>
          <SubTabs options={PEOPLE_VIEWS} value={view as (typeof PEOPLE_VIEWS)[number]} onChange={(v) => go("People", v)} />
          {view === "Admins" ? admins : <StaffManager setup={setup} onChanged={load} />}
        </>
      )}
      {tab === "QR codes" && <QrCodes setup={setup} onChanged={load} />}
      {tab === "Settings" && <SchoolForm school={setup.school} onSaved={load} />}
    </main>
  );
}
