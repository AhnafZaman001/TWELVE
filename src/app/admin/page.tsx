import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/admin-app";

export const metadata: Metadata = { title: "Admin · TWELVE" };

// Edit everything: school, groups, rooms, sections, rounds, checks, staff, QR codes.
// Open on a developer's laptop only until admin login is added.
export default function AdminPage() {
  return <AdminApp />;
}
