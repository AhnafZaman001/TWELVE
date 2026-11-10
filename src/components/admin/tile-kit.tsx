"use client";

import { useState } from "react";
import type { EntityKind } from "@/lib/types";
import { SortableArea, SortableItem } from "./sortable";

// Shared pieces for the compact admin lists (Sections, Rooms, Staff):
// a header with search + add, collapsible blocks of small tiles, and
// a small editor that opens under the block when a tile is clicked.

export const field = "min-h-10 w-full rounded-lg border border-line bg-surface px-2";

export type SaveResult = { ok: boolean; error?: string; row?: { id: string } };

export async function saveRow(kind: EntityKind, body: Record<string, unknown>): Promise<SaveResult> {
  if (!body.id) {
    body = { ...body };
    delete body.id; // a new row: the server makes the id
  }
  const res = await fetch(`/api/admin/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false, error: "Could not save" }));
}

export async function deleteRow(kind: EntityKind, id: string): Promise<SaveResult> {
  const res = await fetch(`/api/admin/${kind}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.json().catch(() => ({ ok: false, error: "Could not delete" }));
}

// numbers inside names sort as numbers: K-2 before K-10
export const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export function ListHeader(props: {
  title: string;
  summary: React.ReactNode;
  query: string;
  onQuery: (q: string) => void;
  searchLabel: string;
  addLabel: string;
  adding: boolean;
  onAdd: () => void;
  extra?: React.ReactNode; // more buttons before the add button
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">{props.title}</h2>
        <p className="text-sm text-muted">{props.summary}</p>
      </div>
      <div className="flex gap-2">
        <input
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
          placeholder={props.searchLabel}
          aria-label={props.searchLabel}
          className="min-h-10 w-48 rounded-xl border border-line bg-surface px-3 text-sm"
        />
        {props.extra}
        <button
          type="button"
          onClick={props.onAdd}
          className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
        >
          {props.adding ? "Close" : props.addLabel}
        </button>
      </div>
    </div>
  );
}

export type TileItem = {
  id: string;
  title: string;
  sub: string;
  warn?: boolean;
  off?: boolean;
};

// One collapsible block of tiles. `editor` renders under the grid for the open tile.
export function TileBlock(props: {
  name: string;
  count: number;
  items: TileItem[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  editor?: React.ReactNode;
  empty?: string;
  startClosed?: boolean;
  forceOpen?: boolean;
  action?: React.ReactNode; // e.g. an Edit button in the header
  children?: React.ReactNode; // shown above the tiles, e.g. the block's own editor
  onReorder?: (ids: string[]) => void; // set to let tiles be dragged; each tile then shows its number
  sortDisabled?: boolean; // e.g. while searching, when only some tiles show
}) {
  const [closed, setClosed] = useState(Boolean(props.startClosed));
  const isClosed = closed && !props.forceOpen;
  return (
    <div className="rounded-2xl border border-line">
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={() => setClosed((c) => !c)}
          aria-expanded={!isClosed}
          className="flex flex-1 items-center justify-between gap-3 py-3 pl-4 text-left"
        >
          <span className="font-semibold">
            {props.name} <span className="font-normal text-muted">· {props.count}</span>
          </span>
          <span className="text-sm text-muted">{isClosed ? "Show" : "Hide"}</span>
        </button>
        {props.action}
      </div>
      {!isClosed && (
        <div className="border-t border-line p-3">
          {props.children}
          {props.items.length === 0 ? (
            <p className="px-1 text-sm text-muted">{props.empty ?? "Nothing here yet."}</p>
          ) : (
            <SortableArea
              ids={props.items.map((t) => t.id)}
              layout="grid"
              disabled={!props.onReorder || props.sortDisabled}
              onReorder={(ids) => props.onReorder?.(ids)}
            >
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {props.items.map((t, i) => (
                  <SortableItem
                    key={t.id}
                    id={t.id}
                    className={props.onReorder && !props.sortDisabled ? "touch-manipulation" : ""}
                    handle={
                      <button
                        type="button"
                        onClick={() => props.onOpen(props.openId === t.id ? null : t.id)}
                        aria-pressed={props.openId === t.id}
                        className={`relative flex w-full flex-col rounded-xl border px-3 py-2 text-left ${
                          props.openId === t.id
                            ? "border-accent bg-accent/10"
                            : "border-line bg-surface hover:border-muted"
                        } ${t.off ? "opacity-50" : ""} ${props.onReorder && !props.sortDisabled ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        {props.onReorder && (
                          <span
                            className="absolute top-1.5 right-2 text-xs text-muted tabular-nums"
                            aria-label={`Number ${i + 1}`}
                          >
                            {i + 1}
                          </span>
                        )}
                        <span className="truncate pr-5 font-semibold">{t.title}</span>
                        <span className={`truncate text-xs ${t.warn ? "text-warn" : "text-muted"}`}>{t.sub}</span>
                      </button>
                    }
                  />
                ))}
              </ul>
            </SortableArea>
          )}
          {props.editor}
        </div>
      )}
    </div>
  );
}

// The frame around a tile's edit form: fields, then Save / Close / Delete.
export function EditorFrame(props: {
  children: React.ReactNode;
  error: string | null;
  busy: boolean;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void; // left out for a new row
  saveLabel?: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-accent/40 p-3 text-sm">
      {props.children}
      {props.error && <p className="text-danger">{props.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={props.busy}
          onClick={props.onSave}
          className="min-h-9 rounded-lg bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          {props.saveLabel ?? "Save"}
        </button>
        <button type="button" onClick={props.onClose} className="min-h-9 rounded-lg px-3 text-muted">
          {props.onDelete ? "Close" : "Cancel"}
        </button>
        {props.onDelete && (
          <button
            type="button"
            disabled={props.busy}
            onClick={props.onDelete}
            className="ml-auto min-h-9 rounded-lg px-3 text-danger"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// State + save/delete for one open editor.
export function useEditor<T extends { id: string }>(kind: EntityKind, row: T, onChanged: () => void) {
  const [draft, setDraft] = useState(row);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof T>(k: K, v: T[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function run(action: () => Promise<SaveResult>) {
    setBusy(true);
    const out = await action();
    setBusy(false);
    if (!out.ok) return setError(out.error ?? "Could not save");
    onChanged();
  }
  return {
    draft,
    set,
    error,
    busy,
    save: () => void run(() => saveRow(kind, draft)),
    remove: (confirmText: string) => {
      if (window.confirm(confirmText)) void run(() => deleteRow(kind, row.id));
    },
  };
}

// A preview chip for one pasted line; red when it will be skipped.
export function LineChip(props: { title: string; note: string; problem?: boolean }) {
  return (
    <li className={`rounded-lg border px-2 py-1 ${props.problem ? "border-danger/50 text-danger" : "border-line"}`}>
      <span className="font-semibold">{props.title}</span>
      <span className={props.problem ? "" : "text-muted"}> {props.note}</span>
    </li>
  );
}

// A small Edit button for a block header.
export function HeaderButton(props: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`min-h-8 shrink-0 rounded-lg border px-2 text-xs font-medium ${
        props.active ? "border-accent text-accent" : "border-line text-muted hover:text-foreground"
      }`}
    >
      {props.label}
    </button>
  );
}

// Two or three views inside one tab, e.g. Sections | Rooms.
export function SubTabs<T extends string>(props: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex w-fit gap-1 rounded-xl border border-line p-1 text-sm" role="tablist">
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={props.value === o}
          onClick={() => props.onChange(o)}
          className={`min-h-8 rounded-lg px-3 font-medium ${props.value === o ? "bg-surface text-foreground ring-1 ring-line" : "text-muted"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
