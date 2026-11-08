import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckFlow } from "@/components/check-flow";
import { getBackend } from "@/lib/data";
import { currentRound, roundsByTime, sectionInRoom } from "@/lib/setup";

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
  const { token } = await props.params;
  const db = await getBackend();
  const room = await db.getRoomByToken(token);
  if (!room) notFound();
  const setup = await db.getSetup();

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
      staff={setup.staff.filter((s) => s.active)}
    />
  );
}
