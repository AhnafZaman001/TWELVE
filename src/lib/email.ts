// Sends e-mail through Resend (resend.com). Without RESEND_API_KEY it does
// nothing, so local development never sends mail.
import "server-only";

const FROM = process.env.ALERT_FROM || "TWELVE <twelve@keystonelabs.site>";

export async function sendEmail(msg: { to: string[]; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || msg.to.length === 0) return { sent: false, reason: key ? "no recipients" : "no RESEND_API_KEY" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) {
    // Resend explains the problem in "message", e.g. a domain that is not verified
    const body = await res.json().catch(() => null);
    const reason = `Resend ${res.status}${body?.message ? `: ${body.message}` : ""}`;
    console.error("E-mail not sent:", reason);
    return { sent: false, reason };
  }
  return { sent: true, reason: null };
}
