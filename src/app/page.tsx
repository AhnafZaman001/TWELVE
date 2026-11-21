import Link from "next/link";
import { TwelveDial } from "@/components/twelve-dial";

// The front door. Admins open TWELVE (sign-in, then the live board);
// teachers never come here: they scan the QR code in their room.
const steps = ["Scan", "Check", "Alert"];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <TwelveDial accent="var(--accent)" ink="var(--foreground)" inner={0.46} className="w-40 sm:w-48">
        <span className="text-4xl font-bold text-accent tabular-nums">12</span>
      </TwelveDial>
      <h1 className="text-5xl font-semibold tracking-tight">TWELVE</h1>
      {/* a full page load: opening TWELVE always asks for a sign-in */}
      <a
        href="/board"
        className="inline-flex min-h-12 items-center rounded-xl bg-accent px-8 font-semibold text-accent-ink"
      >
        Open TWELVE
      </a>
      <ol className="flex flex-wrap justify-center gap-3 text-sm">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-2 rounded-full border border-line px-4 py-2">
            <span className="text-muted tabular-nums">{i + 1}</span>
            <span className="font-semibold">{step}</span>
          </li>
        ))}
      </ol>
      <Link href="/privacy" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">
        Privacy policy
      </Link>
    </main>
  );
}
