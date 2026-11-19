"use client";

import { useEffect, useState } from "react";
import type { Board, BoardAlert, BoardSection, RoundStatus } from "@/lib/board";
import { addMinutes } from "@/lib/time";
import { Dropdown, type DropdownOption } from "./dropdown";

const POLL_MS = 5000;

const STATUS: Record<RoundStatus, { label: string; chip: string }> = {
  upcoming: { label: "Not started", chip: "border-line text-muted" },
  waiting: { label: "Waiting", chip: "border-warn/50 text-warn" },
  ok: { label: "Done", chip: "border-accent/50 bg-accent/10 text-accent" },
  problem: { label: "Problem", chip: "border-danger bg-danger/10 text-danger" },
  missing: { label: "No report", chip: "border-danger text-danger" },
};

type Filter = "all" | "ok" | "waiting" | "problem" | "missing";
const FILTERS: DropdownOption<Filter>[] = [
  { value: "all", label: "All sections" },
  { value: "ok", label: "Done", dot: "bg-accent" },
  { value: "waiting", label: "Waiting", dot: "bg-warn" },
  { value: "problem", label: "Problem", dot: "bg-danger" },
  { value: "missing", label: "No report", dot: "border border-danger" },
];

function matchesFilter(section: BoardSection, f: Filter) {
  const s = Object.values(section.status);
  if (f === "all") return true;
  if (f === "ok") return s.length > 0 && s.every((x) => x === "ok" || x === "upcoming") && s.includes("ok");
  return s.includes(f);
}

// Useful moments to preview: just after each round starts and after its deadline
function demoClocks(board: Board) {
  const times = board.rounds.flatMap((r) => [addMinutes(r.startTime, 5), addMinutes(r.deadline, 2)]);
  return [...new Set([...times, board.endTime])].sort();
}

export function LiveBoard() {
  const [board, setBoard] = useState<(Board & { backend?: string; canEdit?: boolean }) | null>(null);
  const [failed, setFailed] = useState(false);
  const [clock, setClock] = useState<string>(""); // "" = real time
  const [groupId, setGroupId] = useState<string>("all");
  const [show, setShow] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [attention, setAttention] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/board${clock ? `?at=${clock}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data: Board & { backend?: string; canEdit?: boolean } = await res.json();
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

  const sections = board.sections
    .filter((s) => groupId === "all" || s.groupId === groupId)
    .filter((s) => matchesFilter(s, show))
    .filter((s) => !roundId || ["ok", "problem"].includes(s.status[roundId]))
    .filter((s) => !attention || Object.values(s.status).some((v) => v === "missing" || v === "problem"))
    .filter((s) => `${s.roomCode} ${s.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const open = board.sections.find((s) => s.id === openId) ?? null;
  const active = board.rounds.find((r) => r.id === board.activeRoundId);
  function filterSummary(value: Filter, round: string | null = null) {
    setShow(value); setRoundId(round); setAttention(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-widest text-muted uppercase">{board.schoolName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
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
          {board.backend !== "supabase" && <p className="text-xs text-warn">Sample data · not saved</p>}
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
          {board.canEdit && (
            <details className="relative">
              <summary className="cursor-pointer rounded-xl border border-line px-3 py-2">Demo tools</summary>
              <div className="absolute right-0 z-10 mt-2 flex w-48 flex-col gap-1 rounded-xl border border-line bg-surface p-2">
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
            </details>
          )}
        </div>
      </header>

      <section aria-label="Reporting summary" className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-line bg-line">
        {board.rounds.map((r) => <Stat key={r.id} label={r.name} value={`${board.summary.reported[r.id]}/${board.summary.total}`}
          selected={roundId === r.id} onClick={() => filterSummary("all", roundId === r.id ? null : r.id)} />)}
        <Stat label="Problems" value={board.summary.problems} tone={board.summary.problems ? "danger" : undefined}
          selected={show === "problem"} onClick={() => filterSummary(show === "problem" ? "all" : "problem")} />
        <Stat label="Missing sections" value={board.summary.missing} tone={board.summary.missing ? "danger" : undefined}
          selected={show === "missing"} onClick={() => filterSummary(show === "missing" ? "all" : "missing")} />
      </section>
      <section className="flex flex-col gap-4" aria-label="Rooms and sections">
        <div className="flex flex-wrap items-center gap-2">
          <input type="search" aria-label="Search rooms or sections" placeholder="Search room or section..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm sm:max-w-xs" />
          <Dropdown label="Class year" value={groupId} onChange={setGroupId}
            options={[{ value: "all", label: "All years" }, ...board.groups.map((g) => ({ value: g.id, label: g.name }))]} />
          <Dropdown label="Show" value={show} onChange={(v) => { setShow(v); setRoundId(null); }} options={FILTERS} />
          <button type="button" aria-pressed={attention} onClick={() => { setAttention(!attention); setShow("all"); setRoundId(null); }}
            className={`min-h-11 rounded-xl border px-3 text-sm ${attention ? "border-foreground bg-foreground text-background" : "border-line text-muted"}`}>Needs attention</button>
          <button type="button" onClick={() => { setSearch(""); setGroupId("all"); filterSummary("all"); }}
            className="min-h-11 px-3 text-sm text-muted hover:text-foreground">Reset filters</button>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted" aria-live="polite">
          <p>{sections.length} of {board.sections.length} sections{roundId && ` · Reported: ${board.rounds.find((r) => r.id === roundId)?.name}`}</p>
          <p>{failed ? "Connection lost · retrying" : "Updates every 5 seconds"}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Room reporting status by round. Select a room or status to view reports.</caption>
            <thead className="bg-surface text-muted"><tr>
              <th scope="col" className="px-4 py-3 font-medium">Room</th>
              <th scope="col" className="px-4 py-3 font-medium">Section</th>
              {board.rounds.map((r) => <th key={r.id} scope="col" className="min-w-36 px-4 py-3 font-medium">
                <span className="block">{r.name}</span><span className="text-xs font-normal">{r.startTime} · due {r.deadline}</span>
              </th>)}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {sections.map((sec) => <tr key={sec.id} className="hover:bg-surface">
                <th scope="row" className="px-4 py-1 text-left font-semibold">
                  <button type="button" onClick={() => setOpenId(sec.id)} aria-label={`View ${sec.roomCode}, ${sec.name}`}
                    className="min-h-11 min-w-12 underline-offset-4 hover:underline">{sec.roomCode}</button>
                </th>
                <td className="whitespace-nowrap px-4 py-3">{sec.name}</td>
                {board.rounds.map((r) => <td key={r.id} className="px-4 py-1">
                  <button type="button" onClick={() => setOpenId(sec.id)}
                    aria-label={`${sec.roomCode}, ${sec.name}, ${r.name}: ${STATUS[sec.status[r.id]].label}`}
                    className={`min-h-11 whitespace-nowrap text-left ${["missing", "problem"].includes(sec.status[r.id]) ? "text-danger" : sec.status[r.id] === "ok" ? "text-accent" : sec.status[r.id] === "waiting" ? "text-warn" : "text-muted"}`}>
                    <span aria-hidden="true" className="mr-2">{sec.status[r.id] === "ok" ? "✓" : sec.status[r.id] === "problem" ? "!" : "—"}</span>{STATUS[sec.status[r.id]].label}
                  </button>
                </td>)}
              </tr>)}
              {sections.length === 0 && <tr><td colSpan={board.rounds.length + 2} className="p-6 text-muted">
                {board.sections.length ? "No sections match these filters." : "No sections placed in rooms yet. Add them in Admin → Classes."}
              </td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium">Alert details <span className="ml-2 text-muted">{board.alerts.length}</span></summary>
        <p className="mt-2 text-xs text-muted">All alerts for this day, independent of the room filters above.</p>
        {board.alerts.length === 0 && <p className="mt-3 text-sm text-muted">No alerts yet.</p>}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {board.alerts.map((a) => a.kind === "problem" ? <ProblemAlert key={a.id} alert={a} /> : <MissingAlert key={a.id} alert={a} />)}
        </ul>
      </details>

      {open && <SectionDetail section={open} board={board} onClose={() => setOpenId(null)} />}
    </main>
  );
}

type Problem = Extract<BoardAlert, { kind: "problem" }>;
type Missing = Extract<BoardAlert, { kind: "missing" }>;

// One report with problems: where, when, who, then each issue on its own line.
function ProblemAlert({ alert: a }: { alert: Problem }) {
  return (
    <li className="rounded-2xl border border-danger/40 bg-surface p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{a.place}</span>
        <span className="text-xs text-muted tabular-nums">{a.time}</span>
      </div>
      <p className="text-xs text-muted">
        {a.roundName} · {a.who} · {a.role === "invigilator" ? "Invigilator" : "Floor incharge"}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {a.items.map((item) => {
          const skipped = item.startsWith("Skipped: ");
          return (
            <li key={item} className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase ${
                  skipped ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn"
                }`}
              >
                {skipped ? "Skipped" : "Note"}
              </span>
              <span className="text-foreground/90">{skipped ? item.slice(9) : item}</span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

// Sections that have not reported a round: a count, then the sections as tags.
function MissingAlert({ alert: a }: { alert: Missing }) {
  const [open, setOpen] = useState(false);
  const SHOW = 8;
  const shown = open ? a.sections : a.sections.slice(0, SHOW);
  return (
    <li className="rounded-2xl border border-danger p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          <span className="text-danger">{a.sections.length}</span> not reported
        </span>
        <span className="text-xs text-muted tabular-nums">since {a.time}</span>
      </div>
      <p className="text-xs text-muted">{a.roundName}</p>
      <ul className="mt-2 flex flex-wrap gap-1">
        {shown.map((s) => (
          <li key={s} className="rounded-md border border-line px-1.5 py-0.5 text-xs">
            {s}
          </li>
        ))}
      </ul>
      {a.sections.length > SHOW && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-2 text-xs font-medium text-muted underline underline-offset-4 hover:text-foreground"
        >
          {open ? "Show fewer" : `Show all ${a.sections.length}`}
        </button>
      )}
    </li>
  );
}

function Stat(props: { label: string; value: string | number; tone?: "danger"; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={props.onClick} aria-pressed={props.selected}
    className={`min-w-36 flex-1 bg-surface px-4 py-3 text-left hover:bg-background ${props.selected ? "ring-1 ring-inset ring-foreground" : ""}`}>
    <span className="block text-xs text-muted">{props.label}</span>
    <span className={`mt-1 block text-xl font-semibold tabular-nums ${props.tone === "danger" ? "text-danger" : ""}`}>{props.value}</span>
  </button>;
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
            {rep.problems.length > 0 && <ul className="flex flex-col gap-1 text-sm text-danger">
              {rep.problems.map((problem, i) => <li key={i}>{problem}</li>)}
            </ul>}
            {rep.attendance && (
              <p className="text-sm text-muted">
                Class strength {rep.attendance.total} · Present {rep.attendance.present} · Absent{" "}
                {rep.attendance.absent}
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
