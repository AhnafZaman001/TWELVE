"use client";

import { useState } from "react";
import { roundsByTime } from "@/lib/setup";
import type { Audience, Check, CountsKind, Round, Setup } from "@/lib/types";
import { EditorFrame, HeaderButton, field, useEditor } from "./tile-kit";

const LAST_STEP: Record<CountsKind, string> = {
  none: "Nothing",
  attendance: "Count students",
  non_attempting: "Non-attempting students",
};
const WHO: Record<Audience, string> = {
  both: "Everyone",
  invigilator: "Invigilator",
  floor_incharge: "Floor incharge",
};

// Rounds and their checks on one page: each round is a block listing its
// checks in the order teachers see them.
export function TestManager(props: { setup: Setup; onChanged: () => void }) {
  const { setup } = props;
  const [roundEdit, setRoundEdit] = useState<string | null>(null); // round id or "new"
  const [checkEdit, setCheckEdit] = useState<string | null>(null); // check id or "new:<roundId>"
  const rounds = roundsByTime(setup.rounds);
  const checksOf = (r: Round) => setup.checks.filter((c) => c.roundId === r.id).sort((a, b) => a.sort - b.sort);
  const changed = () => {
    setRoundEdit(null);
    setCheckEdit(null);
    props.onChanged();
  };
  const nextSort = (rows: { sort: number }[]) => Math.max(0, ...rows.map((r) => r.sort)) + 1;
  const blankRound: Round = { id: "", name: "", startTime: "08:00", countsKind: "none", sort: nextSort(setup.rounds) };
  const blankCheck = (roundId: string): Check => ({
    id: "",
    roundId,
    audience: "both",
    instruction: "",
    question: "",
    minSeconds: 8,
    active: true,
    sort: nextSort(setup.checks.filter((c) => c.roundId === roundId)),
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Test</h2>
          <p className="text-sm text-muted">
            {rounds.length} rounds · {setup.checks.length} checks. In each round, teachers see these checks one card at a
            time, in this order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRoundEdit(roundEdit === "new" ? null : "new")}
          className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
        >
          {roundEdit === "new" ? "Close" : "Add round"}
        </button>
      </div>

      {roundEdit === "new" && (
        <div className="rounded-2xl border border-line p-3">
          <EditRound round={blankRound} onClose={() => setRoundEdit(null)} onChanged={changed} />
        </div>
      )}

      {rounds.map((round, i) => {
        const checks = checksOf(round);
        return (
          <div key={round.id} className="rounded-2xl border border-line">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="font-semibold">
                {i + 1}. {round.name}
              </span>
              <span className="text-sm text-muted">
                starts {round.startTime} · {checks.length} checks
                {round.countsKind !== "none" && ` · then ${LAST_STEP[round.countsKind].toLowerCase()}`}
              </span>
              <span className="ml-auto">
                <HeaderButton
                  label="Edit round"
                  active={roundEdit === round.id}
                  onClick={() => setRoundEdit(roundEdit === round.id ? null : round.id)}
                />
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t border-line p-3">
              {roundEdit === round.id && (
                <EditRound key={round.id} round={round} checks={checks.length} onClose={() => setRoundEdit(null)} onChanged={changed} />
              )}
              {checks.length === 0 && <p className="px-1 text-sm text-muted">No checks in this round yet.</p>}
              <ol className="flex flex-col gap-1">
                {checks.map((c, n) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCheckEdit(checkEdit === c.id ? null : c.id)}
                      aria-pressed={checkEdit === c.id}
                      className={`flex w-full items-baseline gap-3 rounded-xl border px-3 py-2 text-left ${
                        checkEdit === c.id ? "border-accent bg-accent/10" : "border-transparent hover:border-line"
                      } ${c.active ? "" : "opacity-50"}`}
                    >
                      <span className="w-5 shrink-0 text-right text-sm text-muted">{n + 1}</span>
                      <span className="flex-1">{c.question}</span>
                      <span className="hidden shrink-0 text-xs text-muted sm:inline">
                        {c.active ? `${WHO[c.audience]} · ${c.minSeconds}s` : "Off"}
                      </span>
                    </button>
                    {checkEdit === c.id && (
                      <EditCheck key={c.id} check={c} setup={setup} onClose={() => setCheckEdit(null)} onChanged={changed} />
                    )}
                  </li>
                ))}
              </ol>
              {checkEdit === `new:${round.id}` ? (
                <EditCheck check={blankCheck(round.id)} setup={setup} onClose={() => setCheckEdit(null)} onChanged={changed} />
              ) : (
                <button
                  type="button"
                  onClick={() => setCheckEdit(`new:${round.id}`)}
                  className="min-h-9 self-start rounded-lg px-3 text-sm font-medium text-accent"
                >
                  + Add check
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function EditRound(props: { round: Round; checks?: number; onClose: () => void; onChanged: () => void }) {
  const ed = useEditor("rounds", props.round, props.onChanged);
  const { draft, set } = ed;
  const isNew = !props.round.id;
  return (
    <EditorFrame
      error={ed.error}
      busy={ed.busy}
      onSave={ed.save}
      saveLabel={isNew ? "Add round" : "Save round"}
      onClose={props.onClose}
      onDelete={
        isNew
          ? undefined
          : () => ed.remove(`Delete round “${props.round.name}” and its ${props.checks ?? 0} checks?`)
      }
    >
      <div className="grid gap-3 sm:grid-cols-[3fr_1fr_2fr]">
        <label className="flex flex-col gap-1">
          Round name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Start of test" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Starts
          <input type="time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Last step
          <select value={draft.countsKind} onChange={(e) => set("countsKind", e.target.value as CountsKind)} className={field}>
            {Object.entries(LAST_STEP).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </EditorFrame>
  );
}

function EditCheck(props: { check: Check; setup: Setup; onClose: () => void; onChanged: () => void }) {
  const ed = useEditor("checks", props.check, props.onChanged);
  const { draft, set } = ed;
  const isNew = !props.check.id;
  return (
    <EditorFrame
      error={ed.error}
      busy={ed.busy}
      onSave={ed.save}
      saveLabel={isNew ? "Add check" : "Save"}
      onClose={props.onClose}
      onDelete={isNew ? undefined : () => ed.remove(`Delete the check “${props.check.question}”?`)}
    >
      <div className="grid gap-3">
        <label className="flex flex-col gap-1">
          Question
          <input value={draft.question} onChange={(e) => set("question", e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          Instruction (optional, shown under the question)
          <input value={draft.instruction} onChange={(e) => set("instruction", e.target.value)} className={field} />
        </label>
        <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]">
          <label className="flex flex-col gap-1">
            Round
            <select value={draft.roundId} onChange={(e) => set("roundId", e.target.value)} className={field}>
              {roundsByTime(props.setup.rounds).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Who sees it
            <select value={draft.audience} onChange={(e) => set("audience", e.target.value as Audience)} className={field}>
              {Object.entries(WHO).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Wait (s)
            <input
              type="number"
              value={draft.minSeconds}
              onChange={(e) => set("minSeconds", Number(e.target.value) || 0)}
              className={field}
            />
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
      </div>
    </EditorFrame>
  );
}
