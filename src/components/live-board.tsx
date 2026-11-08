"use client";

import { useEffect, useState } from "react";
import type { Board, BoardRoom, RoundStatus } from "@/lib/board";

const POLL_MS = 5000;
const DEMO_CLOCKS = ["07:55", "08:12", "08:30", "08:40"];

const STATUS: Record<RoundStatus, { label: string; chip: string }> = {
  upcoming: { label: "Not started", chip: "border-line text-muted" },
  waiting: { label: "Waiting", chip: "border-warn/50 text-warn" },
  ok: { label: "Done", chip: "border-accent/50 bg-accent/10 text-accent" },
  problem: { label: "Problem", chip: "border-danger bg-danger/10 text-danger" },
  missing: { label: "No report", chip: "border-danger text-danger" },
};

function roomTone(room: BoardRoom) {
  const s = [room.rounds[1], room.rounds[2]];
  if (s.includes("problem") || s.includes("missing")) return "border-danger/60";
  if (s.includes("waiting")) return "border-warn/50";
  if (s.every((x) => x === "ok")) return "border-accent/50";
  return "border-line";
}

export function LiveBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);
  const [clock, setClock] = useState<string>(""); // "" = real time
  const [year, setYear] = useState<0 | 1 | 2>(0);
  const [openToken, setOpenToken] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/board${clock ? `?at=${clock}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data: Board = await res.json();
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
    if (method === "POST" && !clock) setClock("08:30");
    setReloadKey((k) => k + 1);
  }

  if (!board) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        {failed ? "Could not load the board. Retrying…" : "Loading…"}
      </main>
    );
  }

  const rooms = board.rooms.filter((r) => year === 0 || r.year === year);
  const open = board.rooms.find((r) => r.token === openToken) ?? null;
  const { summary } = board;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-widest text-muted uppercase">TWELVE · Live board</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {board.clock >= board.schedule.endTime
              ? "Test finished"
              : board.activeRound
                ? `Round ${board.activeRound} in progress`
                : "Before the test"}
          </h1>
          <p className="text-sm text-muted">
            {board.dateKey} · {board.clock}
            {clock && " (demo time)"} · test {board.schedule.startTime}–{board.schedule.endTime}
            {failed && " · connection lost, retrying"}
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
            {DEMO_CLOCKS.map((c) => (
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
        <Stat label="Round 1 reported" value={`${summary.round1}/${summary.total}`} />
        <Stat label="Round 2 reported" value={`${summary.round2}/${summary.total}`} />
        <Stat label="Problems" value={summary.problems} tone={summary.problems ? "danger" : undefined} />
        <Stat label="Rooms missing" value={summary.missing} tone={summary.missing ? "danger" : undefined} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-4" aria-label="Rooms">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1 rounded-xl border border-line p-1 text-sm" role="tablist">
              {([0, 1, 2] as const).map((y) => (
                <button
                  key={y}
                  type="button"
                  role="tab"
                  aria-selected={year === y}
                  onClick={() => setYear(y)}
                  className={`min-h-9 rounded-lg px-3 font-medium ${year === y ? "bg-foreground text-background" : "text-muted"}`}
                >
                  {y === 0 ? "All" : y === 1 ? "1st Year" : "2nd Year"}
                </button>
              ))}
            </div>
            <Legend />
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {rooms.map((room) => (
              <li key={room.token}>
                <button
                  type="button"
                  onClick={() => setOpenToken(room.token)}
                  className={`flex w-full flex-col gap-2 rounded-2xl border bg-surface p-3 text-left transition hover:border-foreground ${roomTone(room)}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{room.code}</span>
                    <span className="text-xs text-muted">{room.section}</span>
                  </span>
                  <span className="flex gap-1">
                    {([1, 2] as const).map((r) => (
                      <span
                        key={r}
                        className={`flex-1 rounded-md border px-1.5 py-0.5 text-center text-[11px] font-medium ${STATUS[room.rounds[r]].chip}`}
                        title={`Round ${r}: ${STATUS[room.rounds[r]].label}`}
                      >
                        R{r}
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

      {open && <RoomDetail room={open} onClose={() => setOpenToken(null)} />}
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

function RoomDetail(props: { room: BoardRoom; onClose: () => void }) {
  const { room } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="fixed inset-0 z-10 flex justify-end bg-black/40" onClick={props.onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Room ${room.code}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-background p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {room.code} · {room.section}
            </h2>
            <p className="text-sm text-muted">{room.year === 1 ? "1st Year" : "2nd Year"}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="min-h-10 rounded-xl border border-line px-3 text-sm"
          >
            Close
          </button>
        </div>
        <div className="flex gap-2">
          {([1, 2] as const).map((r) => (
            <span key={r} className={`rounded-lg border px-2 py-1 text-sm ${STATUS[room.rounds[r]].chip}`}>
              Round {r}: {STATUS[room.rounds[r]].label}
            </span>
          ))}
        </div>
        {room.reports.length === 0 && <p className="text-muted">No reports today.</p>}
        {room.reports.map((rep) => (
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
                R{rep.round} · {rep.time}
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
