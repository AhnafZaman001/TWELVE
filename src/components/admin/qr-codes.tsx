"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { Room, Setup } from "@/lib/types";

// One QR per active room. "New QR" replaces a lost or leaked code; the old
// printed one stops working. Print gives one room per page.
export function QrCodes(props: { setup: Setup; onChanged: () => void }) {
  const { setup } = props;
  const [onlyPlaced, setOnlyPlaced] = useState(true);
  const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const sectionOf = (room: Room) => setup.sections.find((s) => s.roomId === room.id && s.active);
  const rooms = setup.rooms
    .filter((r) => r.active && (!onlyPlaced || sectionOf(r)))
    .sort((a, b) => a.sort - b.sort);

  async function renew(room: Room) {
    if (!window.confirm(`Make a new QR code for ${room.code}? The old printed QR will stop working.`)) return;
    await fetch(`/api/admin/rooms/${room.id}/token`, { method: "POST" });
    props.onChanged();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-semibold">QR codes</h2>
          <p className="text-sm text-muted">Print and stick one in each room. {rooms.length} rooms shown.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyPlaced} onChange={(e) => setOnlyPlaced(e.target.checked)} />
            Only rooms with a section
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-10 rounded-xl bg-foreground px-4 font-semibold text-background"
          >
            Print all
          </button>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:block">
        {rooms.map((room) => (
          <li
            key={room.id}
            className="flex flex-col items-center gap-3 rounded-2xl border border-line p-4 text-center print:mb-0 print:flex print:h-[95vh] print:break-after-page print:justify-center print:border-0"
          >
            <p className="text-3xl font-semibold print:text-6xl">
              {room.code}
              {sectionOf(room) && <span className="text-muted"> · {sectionOf(room)!.name}</span>}
            </p>
            <QrImage text={`${origin}/r/${room.token}`} />
            <p className="text-sm text-muted print:text-2xl print:text-black">TWELVE · Scan when your round starts</p>
            <button
              type="button"
              onClick={() => void renew(room)}
              className="min-h-9 rounded-lg px-3 text-sm text-danger print:hidden"
            >
              New QR code
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QrImage(props: { text: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(props.text, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [props.text]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- generated data URL
    <img src={src} alt="QR code" className="size-48 rounded-lg bg-white p-2 print:size-[60vh]" />
  ) : (
    <div className="size-48 rounded-lg bg-line" aria-hidden />
  );
}
