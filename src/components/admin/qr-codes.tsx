"use client";

import { useState } from "react";
import type { RenewScope } from "@/lib/qr";
import type { Setup } from "@/lib/types";
import { QrCard, type Paper } from "../qr-card";

const ROTATE_OPTIONS = [
  { days: 0, label: "Only when I click" },
  { days: 7, label: "Every week" },
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Every month" },
];

// Printable room cards, plus renewing QR codes for a room, a group or everyone.
// A renewed QR makes the old printed card stop working: reprint those rooms.
export function QrCodes(props: { setup: Setup; onChanged: () => void }) {
  const { setup } = props;
  const [paper, setPaper] = useState<Paper>("dark");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const rooms = setup.rooms
    .filter((r) => r.active)
    .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code, undefined, { numeric: true }));
  const issued = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  async function renew(req: RenewScope, what: string) {
    if (!window.confirm(`Make new QR codes for ${what}? The old printed cards will stop working and must be reprinted.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/qr/renew", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not renew" }));
    setBusy(false);
    setMessage(out.ok ? { ok: true, text: `New QR codes made for ${out.renewed} room(s). Print them now.` } : { ok: false, text: out.error });
    if (out.ok) props.onChanged();
  }

  async function setRotation(days: number) {
    const res = await fetch("/api/admin/school", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...setup.school, qrRotateDays: days }),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not save" }));
    setMessage(out.ok ? { ok: true, text: "Auto-renew saved" } : { ok: false, text: out.error });
    if (out.ok) props.onChanged();
  }

  const select = "min-h-10 rounded-xl border border-line bg-surface px-3";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 print:hidden">

        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Paper
            <select value={paper} onChange={(e) => setPaper(e.target.value as Paper)} className={select}>
              <option value="dark">Dark (black card)</option>
              <option value="light">Light (saves ink)</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-10 rounded-xl bg-foreground px-5 font-semibold text-background"
          >
            Print {rooms.length} card{rooms.length === 1 ? "" : "s"} · {Math.ceil(rooms.length / 4)} sheet{Math.ceil(rooms.length / 4) === 1 ? "" : "s"}
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || rooms.length === 0}
              onClick={() => void renew({ scope: "all" }, "all rooms")}
              className="min-h-10 rounded-xl border border-danger px-4 font-semibold text-danger disabled:opacity-50"
            >
              New QR for all rooms
            </button>
            <label className="ml-auto flex items-center gap-2">
              Auto-renew
              <select
                value={setup.school.qrRotateDays}
                onChange={(e) => void setRotation(Number(e.target.value))}
                className={select}
              >
                {ROTATE_OPTIONS.some((o) => o.days === setup.school.qrRotateDays) ? null : (
                  <option value={setup.school.qrRotateDays}>Every {setup.school.qrRotateDays} days</option>
                )}
                {ROTATE_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {message && <p className={message.ok ? "text-accent" : "text-danger"}>{message.text}</p>}
        </div>
      </div>

      {rooms.length === 0 && (
        <p className="rounded-2xl border border-line p-4 text-sm text-muted print:hidden">
          No rooms yet. Add them in Admin → Rooms.
        </p>
      )}

      {/* On paper: four cards per A4 sheet (2 x 2), to cut the sheet into four. On screen: a normal grid. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 print:block">
        {Array.from({ length: Math.ceil(rooms.length / 4) }, (_, page) => (
          <div
            key={page}
            className="contents print:grid print:h-[297mm] print:w-[210mm] print:grid-cols-2 print:grid-rows-2 print:break-after-page"
          >
            {rooms.slice(page * 4, page * 4 + 4).map((room) => (
              <div key={room.id} className="flex flex-col gap-2 print:block print:h-[148.5mm] print:w-[105mm]">
                <QrCard url={`${origin}/r/${room.token}`} roomCode={room.code} theme="midnight" paper={paper} />
                <div className="flex items-center justify-between gap-2 text-xs text-muted print:hidden">
                  <span>Issued {issued(room.qrIssuedAt)}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void renew({ scope: "rooms", roomIds: [room.id] }, room.code)}
                    className="min-h-9 rounded-lg px-2 font-medium text-danger"
                  >
                    New QR for {room.code}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
