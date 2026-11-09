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

function layout(title: string, lines: string[], schoolName: string) {
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
  <p style="margin:0 0 4px;color:#78716c;font-size:12px;letter-spacing:.15em">TWELVE · ${esc(schoolName)}</p>
  <h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
  <ul style="padding-left:18px;margin:0 0 16px">${lines.map((l) => `<li style="margin:4px 0">${esc(l)}</li>`).join("")}</ul>
  <a href="${SITE}/board" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Open the live board</a>
</div>`;
  const text = `${title}\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\nLive board: ${SITE}/board`;
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
