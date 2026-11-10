"use client";

import { useState } from "react";
import type { Room, Section, Setup } from "@/lib/types";

// Sections shown as small tiles under their group, instead of one big row
// each. Click a tile to edit it; "Add sections" takes many at once.
export function SectionsManager(props: { setup: Setup; onChanged: () => void }) {
  const { setup } = props;
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const roomOf = (s: Section) => setup.rooms.find((r) => r.id === s.roomId);
  const q = query.trim().toLowerCase();
  const matches = (s: Section) =>
    !q || s.name.toLowerCase().includes(q) || (roomOf(s)?.code.toLowerCase().includes(q) ?? false);
  const sections = [...setup.sections].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const groups = [...setup.groups].sort((a, b) => a.sort - b.sort);
  const blocks = [
    ...groups.map((g) => ({ key: g.id, name: g.name, rows: sections.filter((s) => s.groupId === g.id) })),
    { key: "none", name: "No group", rows: sections.filter((s) => !groups.some((g) => g.id === s.groupId)) },
  ].filter((b) => b.rows.length > 0 || b.key !== "none");

  const withoutRoom = sections.filter((s) => s.active && !roomOf(s)).length;
  const toggle = (key: string) =>
    setClosed((c) => {
      const next = new Set(c);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const changed = () => {
    setOpenId(null);
    props.onChanged();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Sections</h2>
          <p className="text-sm text-muted">
            {sections.length} sections
            {withoutRoom > 0 && <span className="text-warn"> · {withoutRoom} not in a room yet</span>}. Click a section
            to change its name, group or room.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find section or room"
            aria-label="Find section or room"
            className="min-h-10 w-48 rounded-xl border border-line bg-surface px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
          >
            {adding ? "Close" : "Add sections"}
          </button>
        </div>
      </div>

      {adding && (
        <AddSections
          setup={setup}
          onDone={() => {
            setAdding(false);
            props.onChanged();
          }}
        />
      )}

      {blocks.map((block) => {
        const rows = block.rows.filter(matches);
        if (q && rows.length === 0) return null;
        const isClosed = closed.has(block.key) && !q;
        const open = rows.find((s) => s.id === openId);
        return (
          <div key={block.key} className="rounded-2xl border border-line">
            <button
              type="button"
              onClick={() => toggle(block.key)}
              aria-expanded={!isClosed}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="font-semibold">
                {block.name} <span className="font-normal text-muted">· {block.rows.length}</span>
              </span>
              <span className="text-sm text-muted">{isClosed ? "Show" : "Hide"}</span>
            </button>
            {!isClosed && (
              <div className="border-t border-line p-3">
                {rows.length === 0 ? (
                  <p className="px-1 text-sm text-muted">No sections in this group yet.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {rows.map((s) => {
                      const room = roomOf(s);
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => setOpenId(openId === s.id ? null : s.id)}
                            aria-pressed={openId === s.id}
                            className={`flex w-full flex-col rounded-xl border px-3 py-2 text-left ${
                              openId === s.id ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-muted"
                            } ${s.active ? "" : "opacity-50"}`}
                          >
                            <span className="truncate font-semibold">{s.name}</span>
                            <span className={`truncate text-xs ${room ? "text-muted" : "text-warn"}`}>
                              {!s.active ? "Off" : room ? `Room ${room.code}` : "No room"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {open && <EditSection key={open.id} section={open} setup={setup} onClose={() => setOpenId(null)} onChanged={changed} />}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

const field = "min-h-10 w-full rounded-lg border border-line bg-surface px-2";

// rooms list for a select, marking rooms another active section already uses
function roomChoices(setup: Setup, exceptSectionId?: string) {
  return [...setup.rooms]
    .filter((r) => r.active)
    .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((r) => {
      const user = setup.sections.find((s) => s.roomId === r.id && s.active && s.id !== exceptSectionId);
      return { room: r, label: user ? `${r.code} (has ${user.name})` : r.code, taken: Boolean(user) };
    });
}

async function post(kind: "sections" | "rooms", body: object) {
  const res = await fetch(`/api/admin/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({ ok: false, error: "Could not save" }))) as {
    ok: boolean;
    error?: string;
    row?: { id: string };
  };
}

function EditSection(props: { section: Section; setup: Setup; onClose: () => void; onChanged: () => void }) {
  const [draft, setDraft] = useState(props.section);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Section>(k: K, v: Section[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    setBusy(true);
    const out = await post("sections", draft);
    setBusy(false);
    if (!out.ok) return setError(out.error ?? "Could not save");
    props.onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete section “${props.section.name}”? Past reports keep their copy of the name.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/sections?id=${encodeURIComponent(props.section.id)}`, { method: "DELETE" });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not delete" }));
    setBusy(false);
    if (!out.ok) return setError(out.error);
    props.onChanged();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-accent/40 p-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_2fr_1fr_auto]">
        <label className="flex flex-col gap-1">
          Name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Group
          <select value={draft.groupId ?? ""} onChange={(e) => set("groupId", e.target.value || null)} className={field}>
            <option value="">No group</option>
            {props.setup.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Room
          <select value={draft.roomId ?? ""} onChange={(e) => set("roomId", e.target.value || null)} className={field}>
            <option value="">No room</option>
            {roomChoices(props.setup, draft.id).map((c) => (
              <option key={c.room.id} value={c.room.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Order
          <input
            type="number"
            value={draft.sort}
            onChange={(e) => set("sort", Number(e.target.value) || 0)}
            className={field}
          />
        </label>
        <label className="flex items-center gap-2 sm:mt-6">
          <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="size-4" />
          Active
        </label>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="min-h-9 rounded-lg bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={props.onClose} className="min-h-9 rounded-lg px-3 text-muted">
          Close
        </button>
        <button type="button" disabled={busy} onClick={() => void remove()} className="ml-auto min-h-9 rounded-lg px-3 text-danger">
          Delete
        </button>
      </div>
    </div>
  );
}

type Line = { name: string; roomCode: string | null; room: Room | null; problem: string | null };

// One section per line: "F-1A, K-4" or "F-1A K-4" or just "F-1A".
// A room code that doesn't exist yet becomes a new room.
function parseLines(text: string, setup: Setup, groupId: string | null): Line[] {
  const findRoom = (code: string) => setup.rooms.find((r) => r.code.toLowerCase() === code.toLowerCase()) ?? null;
  const seenNames = new Set<string>();
  const seenRooms = new Set<string>();
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let name = line;
      let roomCode: string | null = null;
      const split = line.split(/\s*[,\t]\s*/);
      if (split.length >= 2) {
        name = split[0];
        roomCode = split[1] || null;
      } else {
        const words = line.split(/\s+/);
        if (words.length >= 2 && findRoom(words[words.length - 1])) {
          roomCode = words.pop()!;
          name = words.join(" ");
        }
      }
      const room = roomCode ? findRoom(roomCode) : null;
      const key = name.toLowerCase();
      let problem: string | null = null;
      if (seenNames.has(key)) problem = "listed twice";
      else if (setup.sections.some((s) => s.name.toLowerCase() === key && s.groupId === groupId)) problem = "already exists";
      else if (roomCode && seenRooms.has(roomCode.toLowerCase())) problem = `room ${roomCode} used twice`;
      else if (room) {
        const user = setup.sections.find((s) => s.roomId === room.id && s.active);
        if (user) problem = `room ${room.code} has ${user.name}`;
      }
      seenNames.add(key);
      if (roomCode) seenRooms.add(roomCode.toLowerCase());
      return { name, roomCode, room, problem };
    });
}

function AddSections(props: { setup: Setup; onDone: () => void }) {
  const { setup } = props;
  const groups = [...setup.groups].sort((a, b) => a.sort - b.sort);
  const [groupId, setGroupId] = useState<string | null>(groups[0]?.id ?? null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const lines = parseLines(text, setup, groupId);
  const ready = lines.filter((l) => !l.problem);
  const newRooms = ready.filter((l) => l.roomCode && !l.room).length;

  async function add() {
    setBusy(true);
    const failed: string[] = [];
    let sort = Math.max(0, ...setup.sections.map((s) => s.sort)) + 1;
    let roomSort = Math.max(0, ...setup.rooms.map((r) => r.sort)) + 1;
    for (const line of ready) {
      let roomId = line.room?.id ?? null;
      if (line.roomCode && !roomId) {
        const made = await post("rooms", { code: line.roomCode, active: true, sort: roomSort++ });
        if (!made.ok || !made.row) {
          failed.push(`${line.name}: ${made.error ?? "could not add room"}`);
          continue;
        }
        roomId = made.row.id;
      }
      const out = await post("sections", { name: line.name, groupId, roomId, active: true, sort: sort++ });
      if (!out.ok) failed.push(`${line.name}: ${out.error ?? "could not add"}`);
    }
    setBusy(false);
    if (failed.length) return setErrors(failed);
    props.onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Group
          <select value={groupId ?? ""} onChange={(e) => setGroupId(e.target.value || null)} className={`${field} min-w-40`}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="">No group</option>
          </select>
        </label>
        <p className="text-muted">One section per line, with its room after a comma or space. Room is optional.</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"F-9, K-12\nF-10, K-13\nF-11"}
        aria-label="Sections to add"
        className="rounded-lg border border-line bg-surface p-2 font-mono"
      />
      {lines.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {lines.map((l, i) => (
            <li
              key={i}
              className={`rounded-lg border px-2 py-1 ${l.problem ? "border-danger/50 text-danger" : "border-line"}`}
            >
              <span className="font-semibold">{l.name}</span>
              <span className={l.problem ? "" : "text-muted"}>
                {" "}
                {l.problem ? `· ${l.problem}` : l.roomCode ? `→ ${l.room ? l.room.code : `new room ${l.roomCode}`}` : "· no room"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {errors.map((e) => (
        <p key={e} className="text-danger">
          {e}
        </p>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || ready.length === 0}
          onClick={() => void add()}
          className="min-h-10 rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          {busy ? "Adding…" : `Add ${ready.length} section${ready.length === 1 ? "" : "s"}`}
        </button>
        {newRooms > 0 && <span className="text-muted">Also adds {newRooms} new room{newRooms === 1 ? "" : "s"}.</span>}
        {lines.length > ready.length && (
          <span className="text-danger">{lines.length - ready.length} line(s) skipped (shown in red).</span>
        )}
      </div>
    </div>
  );
}
