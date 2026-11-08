import Link from "next/link";
import { getRooms } from "@/lib/data";

// Demo index: open any room's check flow without scanning a QR code.
export default function DemoPage() {
  const rooms = getRooms();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Demo rooms</h1>
        <p className="text-muted">
          Each link opens what a teacher sees after scanning that room&apos;s QR code.
        </p>
      </div>
      {([1, 2] as const).map((round) => (
        <section key={round} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Round {round} {round === 1 ? "· start of test" : "· mid-test"}
          </h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {rooms
              .filter((r) => r.isTestRoom)
              .map((r) => (
                <li key={r.token}>
                  <Link
                    href={`/r/${r.token}?round=${round}`}
                    className="block rounded-xl border border-line px-2 py-3 text-center text-sm hover:border-foreground"
                  >
                    {r.code}
                    <span className="block text-xs text-muted">{r.section}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
