"use client";

import { useState } from "react";
import type { Setup, Staff } from "@/lib/types";
import { StaffImport } from "./staff-import";
import { EditorFrame, ListHeader, TileBlock, byName, field, saveRow, useEditor } from "./tile-kit";

const ROLES = [
  { value: "teacher", label: "Teachers" },
  { value: "floor_incharge", label: "Floor incharges" },
] as const;

// Staff as small tiles, split by role. Click a tile to edit; "Add staff"
// adds one person or imports a list pasted from Excel.
export function StaffManager(props: { setup: Setup; onChanged: () => void }) {
  const { setup } = props;
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = (s: Staff) => !q || s.name.toLowerCase().includes(q) || (s.email ?? "").includes(q);
  const staff = [...setup.staff].sort((a, b) => Number(b.active) - Number(a.active) || byName(a.name, b.name));
  const noEmail = staff.filter((s) => s.active && !s.email).length;
  const changed = () => {
    setOpenId(null);
    props.onChanged();
  };

  return (
    <section className="flex flex-col gap-4">
      <ListHeader
        title="Staff"
        summary={
          <>
            {staff.length} people
            {noEmail > 0 && <span className="text-warn"> · {noEmail} without a sign-in email</span>}. They sign in with this
            email (Google or a code). Switch someone off to block them without deleting.
          </>
        }
        query={query}
        onQuery={setQuery}
        searchLabel="Find name or email"
        addLabel="Add staff"
        adding={adding}
        onAdd={() => setAdding((a) => !a)}
      />

      {adding && (
        <div className="flex flex-col gap-3">
          <AddOne
            onDone={() => {
              setAdding(false);
              props.onChanged();
            }}
          />
          <StaffImport onDone={props.onChanged} />
        </div>
      )}

      {ROLES.map((role) => {
        const all = staff.filter((s) => s.role === role.value);
        const rows = all.filter(matches);
        if (q && rows.length === 0) return null;
        const open = rows.find((s) => s.id === openId);
        return (
          <TileBlock
            key={role.value}
            name={role.label}
            count={all.length}
            forceOpen={Boolean(q)}
            openId={openId}
            onOpen={setOpenId}
            empty="Nobody yet."
            items={rows.map((s) => ({
              id: s.id,
              title: s.name,
              sub: !s.active ? "Off" : (s.email ?? "No email"),
              warn: s.active && !s.email,
              off: !s.active,
            }))}
            editor={open && <EditStaff key={open.id} person={open} onClose={() => setOpenId(null)} onChanged={changed} />}
          />
        );
      })}
    </section>
  );
}

function RoleSelect(props: { value: Staff["role"]; onChange: (v: Staff["role"]) => void }) {
  return (
    <select value={props.value} onChange={(e) => props.onChange(e.target.value as Staff["role"])} className={field}>
      <option value="teacher">Teacher</option>
      <option value="floor_incharge">Floor incharge</option>
    </select>
  );
}

function EditStaff(props: { person: Staff; onClose: () => void; onChanged: () => void }) {
  const ed = useEditor("staff", props.person, props.onChanged);
  const { draft, set } = ed;
  return (
    <EditorFrame
      error={ed.error}
      busy={ed.busy}
      onSave={ed.save}
      onClose={props.onClose}
      onDelete={() => ed.remove(`Delete “${props.person.name}”? Past reports keep their name.`)}
    >
      <div className="grid gap-3 sm:grid-cols-[2fr_3fr_2fr_auto]">
        <label className="flex flex-col gap-1">
          Name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Sign-in email
          <input
            type="email"
            value={draft.email ?? ""}
            onChange={(e) => set("email", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          Role
          <RoleSelect value={draft.role} onChange={(v) => set("role", v)} />
        </label>
        <label className="flex items-center gap-2 sm:mt-6">
          <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="size-4" />
          Active
        </label>
      </div>
    </EditorFrame>
  );
}

function AddOne(props: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Staff["role"]>("teacher");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const out = await saveRow("staff", { name, email: email || null, role, active: true });
    setBusy(false);
    if (!out.ok) return setError(out.error ?? "Could not add");
    props.onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
      <p className="font-semibold">Add one person</p>
      <div className="grid gap-3 sm:grid-cols-[2fr_3fr_2fr_auto] sm:items-end">
        <label className="flex flex-col gap-1">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Sign-in email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Role
          <RoleSelect value={role} onChange={setRole} />
        </label>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void add()}
          className="min-h-10 rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
