import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy · TWELVE",
  description: "How TWELVE by Keystone Labs handles personal data.",
};

const CONTACT = "ahnaf7624@gmail.com";
const UPDATED = "9 November 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-medium tracking-widest text-muted uppercase">
          TWELVE · Keystone Labs
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight">Privacy policy</h1>
        <p className="text-sm text-muted">Last updated {UPDATED}</p>
      </header>

      <Section title="Who we are">
        TWELVE is an invigilation check system made by Keystone Labs. Schools use it so that teachers can
        record test-room checks by scanning a QR code, and so that the principal can see those reports live.
        The school decides who can use TWELVE; Keystone Labs runs the service for the school.
      </Section>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Staff and admin details</b> the school enters: name, email address and role (teacher, floor
            incharge, principal or coordinator).
          </li>
          <li>
            <b>Sign-in details:</b> when you sign in with Google we receive only your name, email address and
            profile picture from Google. We do not receive your password or access your Gmail, Drive or any
            other Google data.
          </li>
          <li>
            <b>Reports:</b> the room, the time, the answers to each check, attendance counts, and the names of
            students recorded as not attempting the paper, as entered by the teacher.
          </li>
          <li>
            <b>Technical data:</b> a sign-in cookie that keeps you signed in, and standard server logs.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        Only to run TWELVE for your school: to let listed staff sign in, to save and show test-room reports, and
        to alert the school&apos;s principal and coordinators about problems. We do not sell personal data, show
        advertising, or use the data for any other purpose.
      </Section>

      <Section title="Who can see it">
        People your school has listed as admins (principal, coordinators) can see reports and the staff list.
        Teachers see only their own check flow. Our service providers store and serve the data for us: Supabase
        (database and sign-in) and Vercel (hosting). Google provides the &quot;Continue with Google&quot; sign-in.
      </Section>

      <Section title="How long we keep it">
        Reports and staff records are kept for as long as the school uses TWELVE. The school can edit or delete
        staff, rooms and other records at any time, and can ask us to delete all of its data.
      </Section>

      <Section title="Your choices">
        You can ask your school&apos;s admin, or us, to see, correct or delete your details. If you are removed
        from the staff list you can no longer sign in.
      </Section>

      <Section title="Contact">
        Questions about this policy or your data:{" "}
        <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-4">
          {CONTACT}
        </a>
      </Section>
    </main>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <div className="leading-relaxed text-muted">{props.children}</div>
    </section>
  );
}
