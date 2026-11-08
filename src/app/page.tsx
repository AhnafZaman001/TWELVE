import Link from "next/link";
import { TwelveDial } from "@/components/twelve-dial";

const steps = [
  {
    title: "Scan",
    text: "The invigilator scans the QR code fixed in the room with the phone camera. No app to install.",
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

const explore = [
  {
    href: "/demo",
    title: "Teacher check flow",
    text: "What a teacher sees after scanning a room QR: pick a room and go through the cards.",
  },
  {
    href: "/board",
    title: "Live board",
    text: "The principal's view of every section, alerts and missing rooms. Try “Load sample day”.",
  },
  {
    href: "/admin",
    title: "Admin",
    text: "Edit the school, groups, rooms, sections, rounds, checks and staff.",
  },
  {
    href: "/admin#qr-codes",
    title: "QR room cards",
    text: "Designed A4 cards with the 1–12 dial, colour themes, printing and QR renewal.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-12 px-4 py-16 sm:px-8">
      <header className="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium tracking-widest text-muted uppercase">Keystone Labs</p>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">TWELVE</h1>
          <p className="max-w-xl text-lg text-muted">
            A live reminder system for test invigilation. Teachers are walked through every check,
            room by room, while the test is running.
          </p>
        </div>
        <TwelveDial
          accent="var(--accent)"
          ink="var(--foreground)"
          inner={0.46}
          className="w-56 justify-self-center sm:w-64"
        >
          <span className="text-center">
            <span className="block text-5xl font-bold tracking-tight text-accent tabular-nums">12</span>
            <span className="block text-[10px] font-semibold tracking-[0.35em] text-muted">TWELVE</span>
          </span>
        </TwelveDial>
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

      <section className="flex flex-col gap-4" aria-labelledby="explore">
        <h2 id="explore" className="text-sm font-medium tracking-widest text-muted uppercase">
          Explore
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {explore.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-1 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent"
              >
                <span className="flex items-center justify-between font-semibold">
                  {item.title}
                  <span className="text-muted transition group-hover:translate-x-1 group-hover:text-accent">→</span>
                </span>
                <span className="text-sm text-muted">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-sm text-muted">In development · twelve.keystone-labs.site</footer>
    </main>
  );
}
