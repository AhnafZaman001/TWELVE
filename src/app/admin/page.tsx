import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessGate } from "@/components/access-gate";
import { AdminApp } from "@/components/admin/admin-app";
import { authEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · TWELVE" };

// Edit everything (classes, test, people, QR codes, settings). The tabs are in
// the top bar. Owner and admins only.
export default function AdminPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-muted">Loading…</main>}>
      <AccessGate level="admin" next="/admin">
        <AdminApp passwordSignIn={authEnabled} />
      </AccessGate>
    </Suspense>
  );
}
