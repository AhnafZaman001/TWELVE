import Link from "next/link";
import { TwelveDial } from "@/components/twelve-dial";

// The front door. Admins open TWELVE (the live board, sign-in if needed);
// teachers never come here: they scan the QR code in their room.
const steps = [
  ["Scan", "The teacher scans the QR code in the room. No app to install."],
  ["Check", "One check per card, in order. Each needs a real look before Done."],
  ["Alert", "Skipped checks and rooms with no report reach the principal at once."],
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-8">
      <header className="flex flex-col items-center gap-6 text-center">
        <TwelveDial accent="var(--accent)" ink="var(--foreground)" inner={0.46} className="w-40 sm:w-48">
          <span className="text-4xl font-bold text-accent tabular-nums">12</span>
        </TwelveDial>
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">TWELVE</h1>
          <p className="max-w-lg text-lg text-muted">
            Live invigilation checks for every test room, with alerts for the principal.
          </p>
        </div>
        <Link
          href="/board"
          className="inline-flex min-h-12 items-center rounded-xl bg-accent px-8 font-semibold text-accent-ink"
        >
          Open TWELVE
        </Link>
      </header>

      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-line p-4">
            <span className="text-muted tabular-nums">{i + 1}</span>
            <span>
              <span className="font-semibold">{title}</span>
              <span className="mt-1 block text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between text-xs text-muted">
        <span>TWELVE by Keystone Labs</span>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy policy
        </Link>
      </footer>
    </main>
  );
}
