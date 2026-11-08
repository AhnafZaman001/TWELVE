import Link from "next/link";

const steps = [
  {
    title: "Scan",
    text: "The invigilator scans the QR code fixed in the room. No login, no app to install.",
  },
  {
    title: "Check",
    text: "One check per card: margins, underlining, highlighting, seating, papers. Done unlocks after a real look.",
  },
  {
    title: "Alert",
    text: "Skipped checks, non-attempting students and rooms with no report reach the principal instantly.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-4 py-16 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium tracking-widest text-muted uppercase">
          Keystone Labs
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">TWELVE</h1>
        <p className="max-w-xl text-lg text-muted">
          A live reminder system for test invigilation. Teachers are walked through every check,
          room by room, while the test is running.
        </p>
      </header>

      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="rounded-2xl border border-line p-5">
            <span className="text-sm text-muted">0{i + 1}</span>
            <h2 className="mt-2 text-xl font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between text-sm text-muted">
        <span>In development · twelve.keystone-labs.site</span>
        <span className="flex gap-4">
          <Link href="/demo" className="font-medium text-foreground underline underline-offset-4">
            Teacher demo
          </Link>
          <Link href="/board" className="font-medium text-foreground underline underline-offset-4">
            Live board
          </Link>
        </span>
      </footer>
    </main>
  );
}
