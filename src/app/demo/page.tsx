import Link from "next/link";
import { Suspense } from "react";
import { AccessGate } from "@/components/access-gate";
import { getBackend } from "@/lib/data";
import { roundsByTime } from "@/lib/setup";

// Demo index: open any room's check flow without scanning a QR code.
// Admins only: the links are the rooms' secret QR links.
export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Demo rooms</h1>
        <p className="text-muted">
          Each link opens what a teacher sees after scanning that room&apos;s QR code.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading rooms…</p>}>
        <AccessGate level="admin" next="/demo">
          <RoomLinks />
        </AccessGate>
      </Suspense>
    </main>
  );
}

async function RoomLinks() {
  const db = await getBackend();
  const setup = await db.getSetup();
  const placed = setup.sections
    .filter((s) => s.active && s.roomId)
    .sort((a, b) => a.sort - b.sort)
    .flatMap((s) => {
      const room = setup.rooms.find((r) => r.id === s.roomId && r.active);
      return room ? [{ section: s, room }] : [];
    });

  return roundsByTime(setup.rounds).map((round) => (
    <section key={round.id} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {round.name} <span className="font-normal text-muted">· from {round.startTime}</span>
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {placed.map(({ section, room }) => (
          <li key={section.id}>
            <Link
              href={`/r/${room.token}?round=${round.id}`}
              className="block rounded-xl border border-line px-2 py-3 text-center text-sm hover:border-foreground"
            >
              {room.code}
              <span className="block text-xs text-muted">{section.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ));
}
