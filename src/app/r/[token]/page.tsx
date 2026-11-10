import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/access-gate";
import { CheckFlow } from "@/components/check-flow";
import { authEnabled, getViewer } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { currentRound, roundsByTime, sectionInRoom } from "@/lib/setup";
import type { Staff } from "@/lib/types";

export default function RoomPage(props: PageProps<"/r/[token]">) {
  return (
    <Suspense
      fallback={<main className="flex min-h-dvh items-center justify-center text-muted">Loading…</main>}
    >
      <RoomFlow params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function RoomFlow(props: Pick<PageProps<"/r/[token]">, "params" | "searchParams">) {
  await connection(); // the round depends on the clock, so render per request
  const { token } = await props.params;
  const db = await getBackend();
  const room = await db.getRoomByToken(token);
  if (!room) notFound();
  const setup = await db.getSetup();

  // With sign-in on, the teacher is whoever signed in; without it (sample mode) they pick their name.
  // An admin who is not on the staff list gets a preview: the same cards, nothing saved.
  let me: Staff | null = null;
  let preview = false;
  if (authEnabled) {
    const viewer = await getViewer(setup);
    if (!viewer) redirect(`/login?next=${encodeURIComponent(`/r/${token}`)}`);
    if (viewer.staff) {
      me = viewer.staff;
    } else if (viewer.admin) {
      preview = true;
      me = { id: "preview", name: viewer.admin.name || viewer.email, email: null, role: "teacher", active: true };
    } else {
      return <NoAccess email={viewer.email}>Your email is not on the staff list. Ask the admin to add it.</NoAccess>;
    }
  }

  // ?round=<round id> overrides the clock (for demos and testing)
  const { round: roundParam } = await props.searchParams;
  const rounds = roundsByTime(setup.rounds);
  const round = rounds.find((r) => r.id === roundParam) ?? currentRound(setup);
  if (!round) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center text-muted">
        No test rounds are set up yet.
      </main>
    );
  }
  const next = rounds[rounds.findIndex((r) => r.id === round.id) + 1] ?? null;

  return (
    <CheckFlow
      room={room}
      section={sectionInRoom(setup, room.id)}
      round={round}
      nextRound={next}
      endTime={setup.school.endTime}
      checks={setup.checks.filter((c) => c.active && c.roundId === round.id).sort((a, b) => a.sort - b.sort)}
      me={me}
      preview={preview}
      tryRounds={preview || !authEnabled ? rounds : undefined}
      staff={me ? [] : setup.staff.filter((s) => s.active).map((s) => ({ ...s, email: null }))}
    />
  );
}
