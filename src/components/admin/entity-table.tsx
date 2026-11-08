"use client";

import { useState } from "react";
import type { EntityKind } from "@/lib/types";

export type Column = {
  key: string;
  label: string;
  type: "text" | "number" | "time" | "bool" | "select";
  options?: { value: string; label: string }[]; // for select; "" means none
  wide?: boolean;
};

type Row = Record<string, unknown> & { id?: string };

function without<T>(obj: Record<string, T>, key: string) {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

// An editable list: change any cell, then Save that row. Add and Delete work
// the same for every list (rooms, sections, staff, …).
export function EntityTable(props: {
  kind: EntityKind;
  title: string;
  hint?: string;
  rows: readonly object[];
  columns: Column[];
  blank: () => Row;
  onChanged: () => void;
  extra?: (row: Row) => React.ReactNode; // extra buttons per saved row
}) {
  const [drafts, setDrafts] = useState<Record<string, Row>>({});
  const [newRows, setNewRows] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const keyOf = (row: Row) => row.id as string;
  const current = (key: string, row: Row) => drafts[key] ?? row;
  const setField = (key: string, row: Row, field: string, value: unknown) =>
    setDrafts((d) => ({ ...d, [key]: { ...current(key, row), [field]: value } }));

  async function save(key: string, isNew: boolean) {
    const draft = drafts[key];
    if (!draft) return;
    setBusy(key);
    const body = { ...draft };
    if (isNew) delete body.id;
    const res = await fetch(`/api/admin/${props.kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not save" }));
    setBusy(null);
    if (!out.ok) return setErrors((e) => ({ ...e, [key]: out.error }));
    setErrors((e) => without(e, key));
    setDrafts((d) => without(d, key));
    if (isNew) setNewRows((n) => n.filter((k) => k !== key));
    props.onChanged();
  }

  async function remove(key: string, isNew: boolean, label: string) {
    if (isNew) {
      setNewRows((n) => n.filter((k) => k !== key));
      setDrafts((d) => without(d, key));
      return;
    }
    if (!window.confirm(`Delete “${label}”? Past reports keep their copy of the name.`)) return;
    setBusy(key);
    const res = await fetch(`/api/admin/${props.kind}?id=${encodeURIComponent(key)}`, { method: "DELETE" });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not delete" }));
    setBusy(null);
    if (!out.ok) return setErrors((e) => ({ ...e, [key]: out.error }));
    props.onChanged();
  }

  function addRow() {
    const key = `new-${crypto.randomUUID()}`;
    setNewRows((n) => [key, ...n]);
    setDrafts((d) => ({ ...d, [key]: { ...props.blank(), id: key } }));
  }

  const q = query.trim().toLowerCase();
  const textOf = (row: Row) =>
    props.columns.map((c) => (c.type === "select" ? c.options?.find((o) => o.value === row[c.key])?.label : row[c.key]));
  const allRows = props.rows as Row[];
  const visible = allRows.filter((r) => !q || textOf(r).join(" ").toLowerCase().includes(q));
  const lines: { key: string; row: Row; isNew: boolean }[] = [
    ...newRows.map((key) => ({ key, row: drafts[key], isNew: true })),
    ...visible.map((row) => ({ key: keyOf(row), row, isNew: false })),
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{props.title}</h2>
          {props.hint && <p className="text-sm text-muted">{props.hint}</p>}
        </div>
        <div className="flex gap-2">
          {props.rows.length > 8 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label={`Search ${props.title}`}
              className="min-h-10 w-40 rounded-xl border border-line bg-surface px-3 text-sm"
            />
          )}
          <button
            type="button"
            onClick={addRow}
            className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
          >
            Add
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-line">
              {props.columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={props.columns.length + 1} className="px-3 py-4 text-muted">
                  Nothing here yet. Click Add.
                </td>
              </tr>
            )}
            {lines.map(({ key, row, isNew }) => {
              const value = current(key, row);
              const dirty = isNew || Boolean(drafts[key]);
              const label = String(value[props.columns[0].key] ?? "this item");
              return (
                <tr key={key} className={`border-b border-line last:border-b-0 align-top ${isNew ? "bg-accent/5" : ""}`}>
                  {props.columns.map((c) => (
                    <td key={c.key} className={`px-2 py-1.5 ${c.wide ? "min-w-64" : ""}`}>
                      <Cell column={c} value={value[c.key]} onChange={(v) => setField(key, row, c.key, v)} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap justify-end gap-1">
                      {dirty && (
                        <button
                          type="button"
                          disabled={busy === key}
                          onClick={() => void save(key, isNew)}
                          className="min-h-9 rounded-lg bg-accent px-3 font-semibold text-accent-ink disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                      {!isNew && drafts[key] && (
                        <button
                          type="button"
                          onClick={() => setDrafts((d) => without(d, key))}
                          className="min-h-9 rounded-lg px-2 text-muted"
                        >
                          Undo
                        </button>
                      )}
                      {!isNew && !dirty && props.extra?.(row)}
                      <button
                        type="button"
                        disabled={busy === key}
                        onClick={() => void remove(key, isNew, label)}
                        className="min-h-9 rounded-lg px-2 text-danger"
                      >
                        {isNew ? "Cancel" : "Delete"}
                      </button>
                    </div>
                    {errors[key] && <p className="mt-1 max-w-56 text-right text-xs text-danger">{errors[key]}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell(props: { column: Column; value: unknown; onChange: (v: unknown) => void }) {
  const { column: c, value } = props;
  const base = "min-h-9 w-full rounded-lg border border-line bg-surface px-2";
  if (c.type === "bool") {
    return (
      <input
        type="checkbox"
        aria-label={c.label}
        checked={Boolean(value)}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-2.5 size-4"
      />
    );
  }
  if (c.type === "select") {
    return (
      <select
        aria-label={c.label}
        value={(value as string | null) ?? ""}
        onChange={(e) => props.onChange(e.target.value === "" ? null : e.target.value)}
        className={`${base} min-w-32`}
      >
        {c.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (c.type === "number") {
    return (
      <input
        type="number"
        aria-label={c.label}
        value={Number.isFinite(value as number) ? (value as number) : ""}
        onChange={(e) => props.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`${base} max-w-24`}
      />
    );
  }
  return (
    <input
      type={c.type === "time" ? "time" : "text"}
      aria-label={c.label}
      value={(value as string) ?? ""}
      onChange={(e) => props.onChange(e.target.value)}
      className={base}
    />
  );
}
