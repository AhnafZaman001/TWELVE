"use client";

import { useCallback, useEffect, useState } from "react";
import type { Setup } from "@/lib/types";
import { EntityTable } from "./entity-table";
import { QrCodes } from "./qr-codes";
import { SchoolForm } from "./school-form";

const TABS = ["School", "Groups", "Rooms", "Sections", "Rounds", "Checks", "Staff", "QR codes"] as const;
type Tab = (typeof TABS)[number];
const tabSlug = (t: Tab) => t.toLowerCase().replaceAll(" ", "-");

const yesNo = { type: "bool" } as const;

export function AdminApp() {
  const [setup, setSetup] = useState<(Setup & { backend?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the tab can be linked to, e.g. /admin#qr-codes (the server renders "Loading…" either way)
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return TABS.find((t) => tabSlug(t) === hash) ?? "Sections";
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, "", `#${tabSlug(t)}`);
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

  const none = { value: "", label: "—" };
  const groupOptions = [none, ...setup.groups.map((g) => ({ value: g.id, label: g.name }))];
  const roomOptions = [none, ...setup.rooms.map((r) => ({ value: r.id, label: r.code }))];
  const roundOptions = setup.rounds.map((r) => ({ value: r.id, label: r.name }));
  const nextSort = (rows: { sort: number }[]) => Math.max(0, ...rows.map((r) => r.sort)) + 1;

  const tables: Record<Exclude<Tab, "School" | "QR codes">, React.ReactNode> = {
    Groups: (
      <EntityTable
        kind="groups"
        title="Groups"
        hint="Ways to group sections on the board, e.g. 1st Year, 2nd Year."
        rows={setup.groups}
        columns={[
          { key: "name", label: "Name", type: "text", wide: true },
          { key: "sort", label: "Order", type: "number" },
        ]}
        blank={() => ({ name: "", sort: nextSort(setup.groups) })}
        onChanged={load}
      />
    ),
    Rooms: (
      <EntityTable
        kind="rooms"
        title="Rooms"
        hint="Physical rooms. Each room has its own QR code (see QR codes)."
        rows={setup.rooms}
        columns={[
          { key: "code", label: "Room", type: "text", wide: true },
          { key: "active", label: "Active", ...yesNo },
          { key: "sort", label: "Order", type: "number" },
        ]}
        blank={() => ({ code: "", active: true, sort: nextSort(setup.rooms) })}
        onChanged={load}
      />
    ),
    Sections: (
      <EntityTable
        kind="sections"
        title="Sections"
        hint="Classes taking the test. Put a section in a room to make that room report. One active section per room."
        rows={setup.sections}
        columns={[
          { key: "name", label: "Section", type: "text", wide: true },
          { key: "groupId", label: "Group", type: "select", options: groupOptions },
          { key: "roomId", label: "Room", type: "select", options: roomOptions },
          { key: "active", label: "Active", ...yesNo },
          { key: "sort", label: "Order", type: "number" },
        ]}
        blank={() => ({ name: "", groupId: null, roomId: null, active: true, sort: nextSort(setup.sections) })}
        onChanged={load}
      />
    ),
    Rounds: (
      <EntityTable
        kind="rounds"
        title="Rounds"
        hint="Times in the test when teachers scan and check. Add as many as you need."
        rows={setup.rounds}
        columns={[
          { key: "name", label: "Name", type: "text", wide: true },
          { key: "startTime", label: "Starts", type: "time" },
          {
            key: "countsKind",
            label: "Last step",
            type: "select",
            options: [
              { value: "none", label: "Nothing" },
              { value: "attendance", label: "Count students" },
              { value: "non_attempting", label: "Non-attempting students" },
            ],
          },
          { key: "sort", label: "Order", type: "number" },
        ]}
        blank={() => ({ name: "", startTime: "08:00", countsKind: "none", sort: nextSort(setup.rounds) })}
        onChanged={load}
      />
    ),
    Checks: (
      <EntityTable
        kind="checks"
        title="Checks"
        hint="One card per check. Deleting a round deletes its checks."
        rows={setup.checks}
        columns={[
          { key: "question", label: "Question", type: "text", wide: true },
          { key: "instruction", label: "Instruction", type: "text", wide: true },
          { key: "roundId", label: "Round", type: "select", options: roundOptions },
          {
            key: "audience",
            label: "Who sees it",
            type: "select",
            options: [
              { value: "both", label: "Everyone" },
              { value: "invigilator", label: "Invigilator" },
              { value: "floor_incharge", label: "Floor incharge" },
            ],
          },
          { key: "minSeconds", label: "Wait (s)", type: "number" },
          { key: "active", label: "Active", ...yesNo },
          { key: "sort", label: "Order", type: "number" },
        ]}
        blank={() => ({
          question: "",
          instruction: "",
          roundId: setup.rounds[0]?.id ?? "",
          audience: "both",
          minSeconds: 8,
          active: true,
          sort: nextSort(setup.checks),
        })}
        onChanged={load}
      />
    ),
    Staff: (
      <EntityTable
        kind="staff"
        title="Staff"
        hint="Teachers and floor incharges who can report. Deactivate to hide someone without deleting."
        rows={setup.staff}
        columns={[
          { key: "name", label: "Name", type: "text", wide: true },
          {
            key: "role",
            label: "Role",
            type: "select",
            options: [
              { value: "teacher", label: "Teacher" },
              { value: "floor_incharge", label: "Floor incharge" },
            ],
          },
          { key: "active", label: "Active", ...yesNo },
        ]}
        blank={() => ({ name: "", role: "teacher", active: true })}
        onChanged={load}
      />
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 print:block print:max-w-none print:p-0">
      <header className="flex flex-col gap-1 print:hidden">
        <p className="text-sm font-medium tracking-widest text-muted uppercase">TWELVE · Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">{setup.school.name}</h1>
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
            onClick={() => setTab(t)}
            className={`min-h-9 shrink-0 rounded-lg px-3 font-medium ${tab === t ? "bg-foreground text-background" : "text-muted"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {error && <p className="text-sm text-danger print:hidden">{error}</p>}

      {tab === "School" && <SchoolForm school={setup.school} onSaved={load} />}
      {tab === "QR codes" && <QrCodes setup={setup} onChanged={load} />}
      {tab !== "School" && tab !== "QR codes" && tables[tab]}
    </main>
  );
}
