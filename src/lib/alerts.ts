// Alert e-mails to the school's admins who have "Alert e-mails" switched on.
import "server-only";
import type { NewReport } from "./backend/types";
import { sendEmail } from "./email";
import type { Setup } from "./types";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://twelve.keystonelabs.site";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function alertRecipients(setup: Setup) {
  return setup.admins.filter((a) => a.emailAlerts).map((a) => a.email);
}

function layout(title: string, lines: string[], schoolName: string, note?: string) {
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
  <p style="margin:0 0 4px;color:#78716c;font-size:12px;letter-spacing:.15em">TWELVE · ${esc(schoolName)}</p>
  <h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
  <ul style="padding-left:18px;margin:0 0 16px">${lines.map((l) => `<li style="margin:4px 0">${esc(l)}</li>`).join("")}</ul>
  ${note ? `<p style="margin:0 0 16px;color:#57534e;font-size:13px">${esc(note)}</p>` : ""}
  <a href="${SITE}/board" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Open the live board</a>
</div>`;
  const text = `${title}\n\n${lines.map((l) => `- ${l}`).join("\n")}${note ? `\n\n${note}` : ""}\n\nLive board: ${SITE}/board`;
  return { html, text };
}

// A report with problems, right after the teacher sends it.
export async function emailProblemReport(setup: Setup, r: NewReport) {
  const place = r.sectionName ? `${r.roomCode} · ${r.sectionName}` : r.roomCode;
  const who = `${r.staffName} (${r.role === "invigilator" ? "Invigilator" : "Floor incharge"})`;
  const { html, text } = layout(`${place}: ${r.problems.length} issue${r.problems.length > 1 ? "s" : ""}`, [
    `${r.roundName} · reported by ${who}`,
    ...r.problems,
  ], setup.school.name);
  return sendEmail({ to: alertRecipients(setup), subject: `TWELVE alert: ${place}`, html, text });
}

// Sections that had not reported when a round's deadline passed.
export async function emailMissingReports(setup: Setup, roundName: string, deadline: string, sections: string[]) {
  const { html, text } = layout(
    `${sections.length} section${sections.length > 1 ? "s" : ""} did not report · ${roundName}`,
    [`Deadline ${deadline}`, ...sections],
    setup.school.name,
  );
  return sendEmail({
    to: alertRecipients(setup),
    subject: `TWELVE: ${sections.length} not reported (${roundName})`,
    html,
    text,
  });
}

export type SignInMethod = "google" | "password" | "code";
const METHOD: Record<SignInMethod, string> = { google: "Google", password: "Email and password", code: "Code by email" };

// "Chrome on Windows" from a browser's user-agent text
export function deviceName(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Unknown browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iPhone / iPad"
        : /Mac OS/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

// An admin, owner or coordinator just signed in (any method). Goes to that
// person and to every admin with "Alert e-mails" on. Teachers' sign-ins are
// not e-mailed: there are dozens on every test day.
export async function emailSignIn(
  setup: Setup,
  who: { email: string; name: string; role: string },
  method: SignInMethod,
  from: { ip: string; userAgent: string },
) {
  const when = new Date().toLocaleString("en-GB", {
    timeZone: setup.school.timezone,
    dateStyle: "long",
    timeStyle: "short",
  });
  const role = who.role[0].toUpperCase() + who.role.slice(1);
  const { html, text } = layout(
    `Sign-in: ${who.name || who.email}`,
    [
      `Account: ${who.email} (${role})`,
      `Signed in with: ${METHOD[method]}`,
      `Time: ${when}`,
      `Device: ${deviceName(from.userAgent)}`,
      ...(from.ip ? [`IP address: ${from.ip}`] : []),
    ],
    setup.school.name,
    "If this was not you, sign in, change your password in Settings, and tell the school's owner.",
  );
  const to = [...new Set([who.email, ...alertRecipients(setup)])];
  return sendEmail({ to, subject: `TWELVE sign-in: ${who.email}`, html, text });
}
