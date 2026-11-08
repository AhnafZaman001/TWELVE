"use client";

import { useEffect, useState } from "react";
import type { Board, BoardSection, RoundStatus } from "@/lib/board";
import { addMinutes } from "@/lib/time";

const POLL_MS = 5000;

const STATUS: Record<RoundStatus, { label: string; chip: string }> = {
  upcoming: { label: "Not started", chip: "border-line text-muted" },
  waiting: { label: "Waiting", chip: "border-warn/50 text-warn" },
  ok: { label: "Done", chip: "border-accent/50 bg-accent/10 text-accent" },
  problem: { label: "Problem", chip: "border-danger bg-danger/10 text-danger" },
  missing: { label: "No report", chip: "border-danger text-danger" },
};

function tone(section: BoardSection) {
  const s = Object.values(section.status);
  if (s.includes("problem") || s.includes("missing")) return "border-danger/60";
  if (s.includes("waiting")) return "border-warn/50";
  if (s.length > 0 && s.every((x) => x === "ok")) return "border-accent/50";
  return "border-line";
}

// Useful moments to preview: just after each round starts and after its deadline
function demoClocks(board: Board) {
  const times = board.rounds.flatMap((r) => [addMinutes(r.startTime, 5), addMinutes(r.deadline, 2)]);
  return [...new Set([...times, board.endTime])].sort();
}

export function LiveBoard() {
  const [board, setBoard] = useState<(Board & { backend?: string }) | null>(null);
  const [failed, setFailed] = useState(false);
  const [clock, setClock] = useState<string>(""); // "" = real time
  const [groupId, setGroupId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/board${clock ? `?at=${clock}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data: Board & { backend?: string } = await res.json();
        if (alive) {
          setBoard(data);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [clock, reloadKey]);

  async function demo(method: "POST" | "DELETE") {
    await fetch("/api/demo", { method });
    if (method === "POST" && !clock && board?.rounds.length) {
      setClock(addMinutes(board.rounds.at(-1)!.deadline, -5));
    }
    setReloadKey((k) => k + 1);
  }

  if (!board) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        {failed ? "Could not load the board. Retrying…" : "Loading…"}
      </main>
    );
  }

  const sections = board.sections.filter((s) => groupId === "all" || s.groupId === groupId);
  const open = board.sections.find((s) => s.id === openId) ?? null;
  const active = board.rounds.find((r) => r.id === board.activeRoundId);
  const roundTag = (i: number) => `R${i + 1}`;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-widest text-muted uppercase">
            TWELVE · {board.schoolName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {board.phase === "after"
              ? "Test finished"
              : board.phase === "before"
                ? "Before the test"
                : `${active?.name ?? "Test"} in progress`}
          </h1>
          <p className="text-sm text-muted">
            {board.dateKey} · {board.clock}
            {clock && " (preview time)"}
            {failed && " · connection lost, retrying"}
          </p>
          <p className={`text-xs ${board.backend === "supabase" ? "text-accent" : "text-warn"}`}>
            {board.backend === "supabase" ? "Saved to Supabase" : "Sample data · not saved"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="demo-clock" className="text-muted">
            Time
          </label>
          <select
            id="demo-clock"
            value={clock}
            onChange={(e) => setClock(e.target.value)}
            className="min-h-10 rounded-xl border border-line bg-surface px-3"
          >
            <option value="">Now</option>
            {demoClocks(board).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void demo("POST")}
            className="min-h-10 rounded-xl border border-line px-3 font-medium hover:border-foreground"
          >
            Load sample day
          </button>
          <button
            type="button"
            onClick={() => void demo("DELETE")}
            className="min-h-10 rounded-xl px-3 text-muted hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {board.rounds.map((r) => (
          <Stat key={r.id} label={`${r.name} reported`} value={`${board.summary.reported[r.id]}/${board.summary.total}`} />
        ))}
        <Stat label="Problems" value={board.summary.problems} tone={board.summary.problems ? "danger" : undefined} />
        <Stat label="Sections missing" value={board.summary.missing} tone={board.summary.missing ? "danger" : undefined} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-4" aria-label="Sections">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1 rounded-xl border border-line p-1 text-sm" role="tablist">
              {[{ id: "all", name: "All" }, ...board.groups].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={groupId === g.id}
                  onClick={() => setGroupId(g.id)}
                  className={`min-h-9 rounded-lg px-3 font-medium ${groupId === g.id ? "bg-foreground text-background" : "text-muted"}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <Legend />
          </div>
          {sections.length === 0 && (
            <p className="rounded-2xl border border-line p-4 text-sm text-muted">
              No sections placed in rooms yet. Add them in Admin → Sections.
            </p>
          )}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {sections.map((sec) => (
              <li key={sec.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(sec.id)}
                  className={`flex w-full flex-col gap-2 rounded-2xl border bg-surface p-3 text-left transition hover:border-foreground ${tone(sec)}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{sec.roomCode}</span>
                    <span className="text-xs text-muted">{sec.name}</span>
                  </span>
                  <span className="flex gap-1">
                    {board.rounds.map((r, i) => (
                      <span
                        key={r.id}
                        className={`flex-1 rounded-md border px-1.5 py-0.5 text-center text-[11px] font-medium ${STATUS[sec.status[r.id]].chip}`}
                        title={`${r.name}: ${STATUS[sec.status[r.id]].label}`}
                      >
                        {roundTag(i)}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="order-first flex flex-col gap-3 lg:order-none" aria-label="Alerts">
          <h2 className="text-lg font-semibold">Alerts</h2>
          {board.alerts.length === 0 && (
            <p className="rounded-2xl border border-line p-4 text-sm text-muted">No alerts yet.</p>
          )}
          <ul className="flex flex-col gap-2">
            {board.alerts.map((a) => (
              <li
                key={a.id}
                className={`rounded-2xl border p-3 text-sm ${a.kind === "missing" ? "border-danger" : "border-danger/40"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{a.title}</span>
                  <span className="text-xs text-muted">{a.time}</span>
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 text-muted">
                  {a.detail.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {open && <SectionDetail section={open} board={board} onClose={() => setOpenId(null)} />}
    </main>
  );
}

function Stat(props: { label: string; value: string | number; tone?: "danger" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <dt className="text-sm text-muted">{props.label}</dt>
      <dd className={`mt-1 text-3xl font-semibold tabular-nums ${props.tone === "danger" ? "text-danger" : ""}`}>
        {props.value}
      </dd>
    </div>
  );
}

function Legend() {
  return (
    <ul className="hidden flex-wrap gap-2 text-xs md:flex">
      {(["ok", "waiting", "problem", "missing"] as const).map((s) => (
        <li key={s} className={`rounded-md border px-2 py-0.5 ${STATUS[s].chip}`}>
          {STATUS[s].label}
        </li>
      ))}
    </ul>
  );
}

function SectionDetail(props: { section: BoardSection; board: Board; onClose: () => void }) {
  const { section, board, onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const group = board.groups.find((g) => g.id === section.groupId);

  return (
    <div className="fixed inset-0 z-10 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Section ${section.name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-background p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {section.roomCode} · {section.name}
            </h2>
            {group && <p className="text-sm text-muted">{group.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-line px-3 text-sm">
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {board.rounds.map((r) => (
            <span key={r.id} className={`rounded-lg border px-2 py-1 text-sm ${STATUS[section.status[r.id]].chip}`}>
              {r.name}: {STATUS[section.status[r.id]].label}
            </span>
          ))}
        </div>
        {section.reports.length === 0 && <p className="text-muted">No reports today.</p>}
        {section.reports.map((rep) => (
          <article key={rep.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <header className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">
                {rep.staffName}
                <span className="font-normal text-muted">
                  {" "}
                  · {rep.role === "invigilator" ? "Invigilator" : "Floor incharge"}
                </span>
              </span>
              <span className="text-sm text-muted">
                {rep.roundName} · {rep.time}
              </span>
            </header>
            <ul className="flex flex-col gap-1 text-sm">
              {rep.answers.map((a) => (
                <li key={a.question} className="flex justify-between gap-3">
                  <span>{a.question}</span>
                  <span className={a.result === "done" ? "text-accent" : "font-medium text-danger"}>
                    {a.result === "done" ? "Done" : "Skipped"}
                  </span>
                </li>
              ))}
            </ul>
            {rep.attendance && (
              <p className="text-sm text-muted">
                Total {rep.attendance.total} · Present {rep.attendance.present} · Absent {rep.attendance.absent} ·
                Late {rep.attendance.late}
              </p>
            )}
            {rep.nonAttempting && (
              <p className={`text-sm ${rep.nonAttempting.count ? "text-danger" : "text-muted"}`}>
                Non-attempting: {rep.nonAttempting.count}
                {rep.nonAttempting.names && ` (${rep.nonAttempting.names})`}
              </p>
            )}
          </article>
        ))}
      </aside>
    </div>
  );
}
