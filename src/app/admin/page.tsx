import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessGate } from "@/components/access-gate";
import { AdminApp } from "@/components/admin/admin-app";

export const metadata: Metadata = { title: "Admin · TWELVE" };

// Edit everything: school, groups, rooms, sections, rounds, checks, staff,
// admins, QR codes. Owner and admins only.
export default function AdminPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-muted">Loading…</main>}>
      <AccessGate level="admin" next="/admin">
        <AdminApp />
      </AccessGate>
    </Suspense>
  );
}
