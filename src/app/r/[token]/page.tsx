import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckFlow } from "@/components/check-flow";
import { currentRound, getBackend } from "@/lib/data";

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

  const [schedule, checks, staff] = await Promise.all([db.getSchedule(), db.getChecks(), db.getStaff()]);

  // ?round=1 or ?round=2 overrides the clock (for demos and testing)
  const { round: roundParam } = await props.searchParams;
  const round = roundParam === "1" ? 1 : roundParam === "2" ? 2 : currentRound(schedule);

  return (
    <CheckFlow
      room={room}
      round={round}
      checks={checks.filter((c) => c.round === round)}
      staff={staff}
      schedule={schedule}
    />
  );
}
