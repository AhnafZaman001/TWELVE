import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessGate } from "@/components/access-gate";
import { LiveBoard } from "@/components/live-board";

export const metadata: Metadata = { title: "Live board · TWELVE" };

// Principal's live board: owner, admins and coordinators.
export default function BoardPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-muted">Loading…</main>}>
      <AccessGate level="board" next="/board">
        <LiveBoard />
      </AccessGate>
    </Suspense>
  );
}
