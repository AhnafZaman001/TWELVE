import { redirect } from "next/navigation";

// The old demo page. Trying a room's teacher view now lives on each card in
// Admin → QR codes ("Try it").
export default function DemoPage() {
  redirect("/admin#qr-codes");
}
