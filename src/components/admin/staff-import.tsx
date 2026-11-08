"use client";

import { useState } from "react";

type Result = { applied: boolean; add: string[]; update: string[]; errors: string[] };

// Paste rows copied from Excel (Name, Email, Role), check them, then import.
export function StaffImport(props: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(apply: boolean) {
    setError(null);
    const res = await fetch("/api/admin/staff-import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, apply }),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not import" }));
    if (!out.ok) return setError(out.error);
    setResult(out);
    if (out.applied) {
      setText("");
      props.onDone();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-10 self-start rounded-xl border border-line px-4 text-sm font-semibold hover:border-foreground"
      >
        Import from Excel
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Import staff</p>
          <p className="text-muted">
            In Excel, select the columns <b>Name</b>, <b>Email</b>, <b>Role</b> (Teacher or Floor incharge), copy, and
            paste below. People already on the list are updated, not duplicated.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 text-muted">
          Close
        </button>
      </div>
      <textarea
        aria-label="Staff rows"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        rows={6}
        placeholder={"Ayesha Khan\tayesha@gmail.com\tTeacher\nBilal Ahmed\tbilal@gmail.com\tFloor incharge"}
        className="rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => void run(false)}
          className="min-h-10 rounded-xl border border-line px-4 font-semibold disabled:opacity-50"
        >
          Check
        </button>
        <button
          type="button"
          disabled={!result || result.applied || result.errors.length > 0 || result.add.length + result.update.length === 0}
          onClick={() => void run(true)}
          className="min-h-10 rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          Import
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
      {result && (
        <div className="flex flex-col gap-1">
          {result.applied && <p className="text-accent">Imported.</p>}
          <p>
            {result.add.length} new · {result.update.length} updated
            {result.errors.length > 0 && <span className="text-danger"> · {result.errors.length} to fix</span>}
          </p>
          {result.errors.map((e) => (
            <p key={e} className="text-danger">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
