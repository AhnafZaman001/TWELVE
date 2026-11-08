import type { Metadata } from "next";
import { LiveBoard } from "@/components/live-board";

export const metadata: Metadata = { title: "Live board · TWELVE" };

// Principal's live board. Open for now; protected by Supabase login once connected.
export default function BoardPage() {
  return <LiveBoard />;
}
