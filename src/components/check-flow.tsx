"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReportInput } from "@/lib/report";
import type { Check, Role, Room, Round, Section, Staff } from "@/lib/types";

type Answer = ReportInput["answers"][number];
type Attendance = NonNullable<ReportInput["attendance"]>;
type NonAttempting = NonNullable<ReportInput["nonAttempting"]>;

type Step =
  | { kind: "who" }
  | { kind: "arrive" }
  | { kind: "check"; index: number }
  | { kind: "attendance" }
  | { kind: "non-attempting" }
  | { kind: "sending" }
  | { kind: "done"; problems: string[] }
  | { kind: "error" };

const STAFF_KEY = "twelve:staffId";

// Remembered name on this phone (read safely, works without storage)
function useRememberedStaffId() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => {
      try {
        return localStorage.getItem(STAFF_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

function roomLabel(room: Room, section: Section | null) {
  return section ? `${room.code} · ${section.name}` : room.code;
}

export function CheckFlow(props: {
  room: Room;
  section: Section | null;
  round: Round;
  nextRound: Round | null;
  endTime: string;
  checks: Check[];
  me: Staff | null; // signed-in staff member; null in sample mode, where they pick their name
  staff: Staff[];
}) {
  const { room, section, round, nextRound, me } = props;
  const staff = me ? [me] : props.staff;
  const [step, setStep] = useState<Step>(me ? { kind: "arrive" } : { kind: "who" });
  const [role, setRole] = useState<Role>(me?.role === "floor_incharge" ? "floor_incharge" : "invigilator");
  const [staffId, setStaffId] = useState<string | null>(me?.id ?? null);
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [attendance, setAttendance] = useState<Attendance | undefined>();
  const [nonAttempting, setNonAttempting] = useState<NonAttempting | undefined>();

  const checks = props.checks.filter((c) => c.audience === "both" || c.audience === role);
  const person = staff.find((s) => s.id === staffId);
  const countsStep: Step | null =
    role === "floor_incharge" || round.countsKind === "none"
      ? null
      : round.countsKind === "attendance"
        ? { kind: "attendance" }
        : { kind: "non-attempting" };

  // total steps for the progress bar: arrive + checks + counts
  const totalSteps = 1 + checks.length + (countsStep ? 1 : 0);
  const doneSteps =
    step.kind === "who" ? 0
    : step.kind === "arrive" ? 0
    : step.kind === "check" ? 1 + step.index
    : step.kind === "attendance" || step.kind === "non-attempting" ? 1 + checks.length
    : totalSteps;

  function afterChecks(nextAnswers: Answer[]) {
    if (countsStep) setStep(countsStep);
    else void submit(nextAnswers, undefined, undefined);
  }

  function answer(check: Check, result: Answer["result"], secondsOnCard: number, index: number) {
    const next = [...answers, { checkId: check.id, result, secondsOnCard }];
    setAnswers(next);
    if (index + 1 < checks.length) setStep({ kind: "check", index: index + 1 });
    else afterChecks(next);
  }

  async function submit(finalAnswers: Answer[], att?: Attendance, na?: NonAttempting) {
    setStep({ kind: "sending" });
    const report: ReportInput = {
      roomToken: room.token,
      staffId: staffId!,
      role,
      roundId: round.id,
      arrivedAt: arrivedAt!,
      answers: finalAnswers,
      attendance: att,
      nonAttempting: na,
    };
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(report),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error);
      setStep({ kind: "done", problems: body.problems });
    } catch {
      setStep({ kind: "error" });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-6">
      <header className="flex items-center justify-between text-sm">
        <span className="font-semibold tracking-wide">TWELVE</span>
        <span className="text-muted">
          Room {roomLabel(room, section)} · {round.name}
        </span>
      </header>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${(doneSteps / totalSteps) * 100}%` }}
        />
      </div>

      <section className="flex flex-1 flex-col pt-8">
        {step.kind === "who" && (
          <WhoCard
            label={roomLabel(room, section)}
            round={round}
            endTime={props.endTime}
            staff={staff}
            role={role}
            onRole={setRole}
            onPick={(id) => {
              setStaffId(id);
              try {
                localStorage.setItem(STAFF_KEY, id);
              } catch {}
              setStep({ kind: "arrive" });
            }}
          />
        )}

        {step.kind === "arrive" && (
          <Card
            eyebrow={`Hello, ${person?.name}`}
            title={`Are you in room ${room.code} now?`}
            body="Answer only when you are standing in the room."
          >
            <BigButton
              onClick={() => {
                setArrivedAt(new Date().toISOString());
                if (checks.length) setStep({ kind: "check", index: 0 });
                else afterChecks([]);
              }}
            >
              Yes, I&apos;m here
            </BigButton>
          </Card>
        )}

        {step.kind === "check" && (
          <CheckCard
            key={checks[step.index].id}
            check={checks[step.index]}
            position={`Check ${step.index + 1} of ${checks.length}`}
            onAnswer={(result, seconds) => answer(checks[step.index], result, seconds, step.index)}
          />
        )}

        {step.kind === "attendance" && (
          <AttendanceCard
            onSubmit={(att) => {
              setAttendance(att);
              void submit(answers, att, undefined);
            }}
          />
        )}

        {step.kind === "non-attempting" && (
          <NonAttemptingCard
            onSubmit={(na) => {
              setNonAttempting(na);
              void submit(answers, attendance, na);
            }}
          />
        )}

        {step.kind === "sending" && <Card eyebrow="Sending" title="Saving your report…" />}

        {step.kind === "done" && (
          <Card
            eyebrow="Report sent"
            title={step.problems.length ? "Thank you. The principal has been alerted." : "All checks done. Thank you!"}
          >
            {step.problems.length > 0 && (
              <ul className="flex flex-col gap-2 text-sm">
                {step.problems.map((p) => (
                  <li key={p} className="rounded-xl border border-warn/40 px-3 py-2 text-warn">
                    {p}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted">
              {nextRound
                ? `Scan this QR again after ${nextRound.startTime} for “${nextRound.name}”.`
                : "You are done for this test."}
            </p>
          </Card>
        )}

        {step.kind === "error" && (
          <Card eyebrow="Not sent" title="Could not send your report.">
            <p className="text-sm text-muted">Check your internet and try again.</p>
            <BigButton onClick={() => void submit(answers, attendance, nonAttempting)}>Try again</BigButton>
          </Card>
        )}
      </section>
    </main>
  );
}

function Card(props: { eyebrow?: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        {props.eyebrow && <p className="text-sm font-medium text-muted">{props.eyebrow}</p>}
        <h1 className="text-3xl leading-tight font-semibold tracking-tight">{props.title}</h1>
        {props.body && <p className="text-lg text-muted">{props.body}</p>}
      </div>
      {props.children && <div className="mt-auto flex flex-col gap-3">{props.children}</div>}
    </div>
  );
}

function BigButton(props: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "quiet";
  children: React.ReactNode;
}) {
  const style =
    props.variant === "quiet"
      ? "border border-line text-foreground"
      : "bg-accent text-accent-ink disabled:bg-line disabled:text-muted";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`min-h-14 w-full rounded-2xl px-5 text-lg font-semibold transition active:scale-[0.98] ${style}`}
    >
      {props.children}
    </button>
  );
}

function WhoCard(props: {
  label: string;
  round: Round;
  endTime: string;
  staff: Staff[];
  role: Role;
  onRole: (r: Role) => void;
  onPick: (staffId: string) => void;
}) {
  const remembered = useRememberedStaffId();
  const [query, setQuery] = useState("");
  const pool = props.staff.filter((s) =>
    props.role === "floor_incharge" ? s.role === "floor_incharge" : s.role === "teacher",
  );
  const last = pool.find((s) => s.id === remembered);
  const matches = pool.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">
          From {props.round.startTime} · test ends {props.endTime}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Room {props.label}</h1>
        <p className="text-muted">{props.round.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line p-1" role="radiogroup">
        {(["invigilator", "floor_incharge"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={props.role === r}
            onClick={() => props.onRole(r)}
            className={`min-h-11 rounded-xl text-sm font-semibold ${
              props.role === r ? "bg-foreground text-background" : "text-muted"
            }`}
          >
            {r === "invigilator" ? "Invigilator" : "Floor incharge"}
          </button>
        ))}
      </div>

      {last && (
        <BigButton onClick={() => props.onPick(last.id)}>Continue as {last.name}</BigButton>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="staff-search" className="text-sm font-medium">
          {last ? "Not you? Find your name" : "Find your name"}
        </label>
        <input
          id="staff-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search"
          autoComplete="off"
          className="min-h-12 rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-foreground"
        />
        <ul className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-line">
          {matches.map((s) => (
            <li key={s.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => props.onPick(s.id)}
                className="min-h-12 w-full px-4 text-left text-base active:bg-line"
              >
                {s.name}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-4 py-3 text-sm text-muted">No match</li>}
        </ul>
      </div>
    </div>
  );
}

function CheckCard(props: {
  check: Check;
  position: string;
  onAnswer: (result: Answer["result"], secondsOnCard: number) => void;
}) {
  const { check } = props;
  const [left, setLeft] = useState(check.minSeconds);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    shownAt.current = Date.now();
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = () => Math.round((Date.now() - shownAt.current) / 1000);

  return (
    <Card eyebrow={props.position} title={check.question} body={check.instruction}>
      {confirmSkip ? (
        <>
          <p className="text-center text-sm text-warn">
            Skipping is recorded as not done and alerts the principal.
          </p>
          <BigButton variant="quiet" onClick={() => props.onAnswer("skipped", seconds())}>
            Skip anyway
          </BigButton>
          <BigButton onClick={() => setConfirmSkip(false)}>Go back and check</BigButton>
        </>
      ) : (
        <>
          <BigButton disabled={left > 0} onClick={() => props.onAnswer("done", seconds())}>
            {left > 0 ? `Look first… ${left}s` : "Yes, done"}
          </BigButton>
          <BigButton variant="quiet" onClick={() => setConfirmSkip(true)}>
            Skip
          </BigButton>
        </>
      )}
    </Card>
  );
}

function NumberField(props: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={props.id} className="flex items-center justify-between gap-4">
      <span className="text-base">{props.label}</span>
      <input
        id={props.id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
        className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-right text-lg outline-none focus:border-foreground"
      />
    </label>
  );
}

function AttendanceCard(props: { onSubmit: (a: Attendance) => void }) {
  const [v, setV] = useState({ total: "", present: "", absent: "" });
  const n = (s: string) => Number(s || 0);
  const filled = v.total !== "" && v.present !== "" && v.absent !== "";
  const mismatch = filled && n(v.present) + n(v.absent) !== n(v.total);
  const set = (k: keyof typeof v) => (val: string) => setV({ ...v, [k]: val });

  return (
    <Card eyebrow="Last step" title="Student count" body="Enter numbers from the attendance sheet.">
      <div className="flex flex-col gap-3">
        <NumberField id="total" label="Class strength" value={v.total} onChange={set("total")} />
        <NumberField id="present" label="Students present" value={v.present} onChange={set("present")} />
        <NumberField id="absent" label="Students absent" value={v.absent} onChange={set("absent")} />
      </div>
      {mismatch && (
        <p className="text-sm text-warn">Present + absent must equal class strength. Please recount.</p>
      )}
      <BigButton
        disabled={!filled || mismatch}
        onClick={() => props.onSubmit({ total: n(v.total), present: n(v.present), absent: n(v.absent), late: 0 })}
      >
        Send report
      </BigButton>
    </Card>
  );
}

function NonAttemptingCard(props: { onSubmit: (na: NonAttempting) => void }) {
  const [count, setCount] = useState("0");
  const [names, setNames] = useState("");
  const c = Number(count || 0);

  return (
    <Card
      eyebrow="Last step"
      title="Is anyone not attempting the paper?"
      body="Look around the room. Count students who are not writing."
    >
      <NumberField id="non-attempting" label="Non-attempting students" value={count} onChange={setCount} />
      {c > 0 && (
        <label htmlFor="na-names" className="flex flex-col gap-2">
          <span className="text-sm font-medium">Their names</span>
          <textarea
            id="na-names"
            value={names}
            onChange={(e) => setNames(e.target.value)}
            rows={3}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-foreground"
          />
        </label>
      )}
      <BigButton
        disabled={c > 0 && names.trim() === ""}
        onClick={() => props.onSubmit({ count: c, names: c > 0 ? names.trim() : "" })}
      >
        Send report
      </BigButton>
    </Card>
  );
}
