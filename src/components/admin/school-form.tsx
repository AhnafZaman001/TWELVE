"use client";

import { useState } from "react";
import type { School } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SchoolForm(props: { school: School; onSaved: () => void }) {
  const [draft, setDraft] = useState<School>(props.school);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof School>(key: K, value: School[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    const res = await fetch("/api/admin/school", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not save" }));
    setMessage(out.ok ? { ok: true, text: "Saved" } : { ok: false, text: out.error });
    if (out.ok) props.onSaved();
  }

  const field = "min-h-10 rounded-xl border border-line bg-surface px-3";
  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h2 className="text-xl font-semibold">School</h2>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input className={field} value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Timezone
        <input
          className={field}
          value={draft.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          placeholder="Asia/Karachi"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Test ends at
          <input type="time" className={field} value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          “No report” after (minutes)
          <input
            type="number"
            min={0}
            className={field}
            value={draft.bufferMinutes}
            onChange={(e) => set("bufferMinutes", Number(e.target.value))}
          />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">Test days</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => {
            const day = i + 1;
            const on = draft.testWeekdays.includes(day);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set("testWeekdays", on ? draft.testWeekdays.filter((x) => x !== day) : [...draft.testWeekdays, day].sort())
                }
                className={`min-h-10 rounded-xl border px-3 ${on ? "border-foreground bg-foreground text-background" : "border-line text-muted"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          className="min-h-10 rounded-xl bg-accent px-5 font-semibold text-accent-ink"
        >
          Save
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-accent" : "text-danger"}`}>{message.text}</span>}
      </div>
    </section>
  );
}
