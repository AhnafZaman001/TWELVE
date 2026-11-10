"use client";

import { useState } from "react";
import type { Room, Setup } from "@/lib/types";
import { EditorFrame, LineChip, ListHeader, TileBlock, byName, field, saveRow, useEditor } from "./tile-kit";

// Rooms as small tiles, split into rooms with a section, empty rooms and
// rooms switched off. "Add rooms" takes a list or a range like K-51 to K-60.
export function RoomsManager(props: { setup: Setup; onChanged: () => void }) {
  const { setup } = props;
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const sectionIn = (r: Room) => setup.sections.find((s) => s.roomId === r.id && s.active);
  const q = query.trim().toLowerCase();
  const matches = (r: Room) => !q || r.code.toLowerCase().includes(q) || (sectionIn(r)?.name.toLowerCase().includes(q) ?? false);
  const rooms = [...setup.rooms].sort((a, b) => byName(a.code, b.code));
  const blocks = [
    { key: "used", name: "With a section", rows: rooms.filter((r) => r.active && sectionIn(r)) },
    { key: "empty", name: "Empty", rows: rooms.filter((r) => r.active && !sectionIn(r)) },
    { key: "off", name: "Switched off", rows: rooms.filter((r) => !r.active) },
  ].filter((b) => b.rows.length > 0);
  const changed = () => {
    setOpenId(null);
    props.onChanged();
  };

  return (
    <section className="flex flex-col gap-4">
      <ListHeader
        title="Rooms"
        summary={`${rooms.length} rooms. Each room has its own QR code. Put a section in a room from the Sections tab.`}
        query={query}
        onQuery={setQuery}
        searchLabel="Find room or section"
        addLabel="Add rooms"
        adding={adding}
        onAdd={() => setAdding((a) => !a)}
      />

      {adding && (
        <AddRooms
          setup={setup}
          onDone={() => {
            setAdding(false);
            props.onChanged();
          }}
        />
      )}

      {rooms.length === 0 && <p className="text-sm text-muted">No rooms yet. Click Add rooms.</p>}

      {blocks.map((block) => {
        const rows = block.rows.filter(matches);
        if (q && rows.length === 0) return null;
        const open = rows.find((r) => r.id === openId);
        return (
          <TileBlock
            key={block.key}
            name={block.name}
            count={block.rows.length}
            forceOpen={Boolean(q)}
            startClosed={block.key === "off"}
            openId={openId}
            onOpen={setOpenId}
            items={rows.map((r) => {
              const section = sectionIn(r);
              return { id: r.id, title: r.code, sub: !r.active ? "Off" : section ? section.name : "Empty", off: !r.active };
            })}
            editor={open && <EditRoom key={open.id} room={open} setup={setup} onClose={() => setOpenId(null)} onChanged={changed} />}
          />
        );
      })}
    </section>
  );
}

function EditRoom(props: { room: Room; setup: Setup; onClose: () => void; onChanged: () => void }) {
  const ed = useEditor("rooms", props.room, props.onChanged);
  const { draft, set } = ed;
  const section = props.setup.sections.find((s) => s.roomId === props.room.id && s.active);
  return (
    <EditorFrame
      error={ed.error}
      busy={ed.busy}
      onSave={ed.save}
      onClose={props.onClose}
      onDelete={() =>
        ed.remove(
          `Delete room “${props.room.code}”?${section ? ` Section ${section.name} will have no room.` : ""} Its printed QR card stops working.`,
        )
      }
    >
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <label className="flex flex-col gap-1">
          Room
          <input value={draft.code} onChange={(e) => set("code", e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Order
          <input type="number" value={draft.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} className={field} />
        </label>
        <label className="flex items-center gap-2 sm:mt-6">
          <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="size-4" />
          Active
        </label>
      </div>
      <p className="text-muted">
        {section ? `Section ${section.name} is in this room.` : "No section in this room."} To change that, use the Sections tab.
      </p>
    </EditorFrame>
  );
}

// "K-1, K-2", one per line, or ranges: "K-51 to K-60", "K-51 - K-60", "K-51..60"
export function expandRooms(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[\n,\t]+/).map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(.*?)(\d+)\s*(?:to|\.\.|-|–)\s*(?:\1)?(\d+)$/i);
    if (range) {
      const [, prefix, from, to] = range;
      const a = Number(from);
      const b = Number(to);
      if (b >= a && b - a <= 200) {
        for (let n = a; n <= b; n++) out.push(`${prefix}${n}`);
        continue;
      }
    }
    out.push(part);
  }
  return out;
}

function AddRooms(props: { setup: Setup; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const seen = new Set<string>();
  const lines = expandRooms(text).map((code) => {
    const key = code.toLowerCase();
    const problem = seen.has(key)
      ? "listed twice"
      : props.setup.rooms.some((r) => r.code.toLowerCase() === key)
        ? "already exists"
        : null;
    seen.add(key);
    return { code, problem };
  });
  const ready = lines.filter((l) => !l.problem);

  async function add() {
    setBusy(true);
    const failed: string[] = [];
    let sort = Math.max(0, ...props.setup.rooms.map((r) => r.sort)) + 1;
    for (const l of ready) {
      const out = await saveRow("rooms", { code: l.code, active: true, sort: sort++ });
      if (!out.ok) failed.push(`${l.code}: ${out.error ?? "could not add"}`);
    }
    setBusy(false);
    if (failed.length) return setErrors(failed);
    props.onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
      <p className="text-muted">
        Type room codes separated by commas or new lines, or a range like <b>K-51 to K-60</b>.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={"K-51 to K-60\nLab 1, Lab 2"}
        aria-label="Rooms to add"
        className="rounded-lg border border-line bg-surface p-2 font-mono"
      />
      {lines.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {lines.map((l, i) => (
            <LineChip key={i} title={l.code} problem={Boolean(l.problem)} note={l.problem ? `· ${l.problem}` : ""} />
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
          {busy ? "Adding…" : `Add ${ready.length} room${ready.length === 1 ? "" : "s"}`}
        </button>
        {lines.length > ready.length && (
          <span className="text-danger">{lines.length - ready.length} skipped (shown in red).</span>
        )}
      </div>
    </div>
  );
}
