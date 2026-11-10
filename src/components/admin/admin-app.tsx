"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { hashFor, onHashChange, placeFromHash, type AdminTab, type AdminView } from "@/lib/admin-tabs";
import type { Setup } from "@/lib/types";
import { AccountPassword } from "./account-password";
import { EntityTable } from "./entity-table";
import { QrCodes } from "./qr-codes";
import { RoomsManager } from "./rooms-manager";
import { SchoolForm } from "./school-form";
import { SectionsManager } from "./sections-manager";
import { StaffManager } from "./staff-manager";
import { TestEmail } from "./test-email";
import { TestManager } from "./test-manager";
import { SubTabs } from "./tile-kit";

// The tabs live in the top bar (AppNav); this screen shows the one named in
// the address, e.g. /admin#test. Classes = groups, sections and rooms;
// Test = rounds and their checks; People = staff and admins.
const CLASS_VIEWS = ["Sections", "Rooms"] as const;
const PEOPLE_VIEWS = ["Staff", "Admins"] as const;

export function AdminApp(props: { passwordSignIn?: boolean }) {
  const [setup, setSetup] = useState<(Setup & { backend?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hash = useSyncExternalStore(onHashChange, () => window.location.hash, () => "");
  const [tab, view] = placeFromHash(hash);
  // a real address change, so the browser's Back button returns to the last tab
  const go = (t: AdminTab, v: AdminView = null) => {
    window.location.hash = hashFor(t, v);
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
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">{setup.school.name}</h1>
        <button
          type="button"
          onClick={() => go("Settings")}
          className="min-h-8 rounded-lg border border-line px-2 text-xs font-medium text-muted hover:text-foreground"
        >
          Rename
        </button>
        <p className={`text-xs ${setup.backend === "supabase" ? "text-accent" : "text-warn"}`}>
          {setup.backend === "supabase"
            ? "Changes are saved to Supabase"
            : "Sample data · changes reset when the server restarts"}
        </p>
      </header>

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
      {tab === "Settings" && (
        <>
          <SchoolForm school={setup.school} onSaved={load} />
          <TestEmail />
          {props.passwordSignIn && <AccountPassword />}
        </>
      )}
    </main>
  );
}
