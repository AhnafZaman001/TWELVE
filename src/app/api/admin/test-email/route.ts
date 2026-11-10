import { requireAccess, getViewer } from "@/lib/auth";
import { getBackend } from "@/lib/data";
import { sendEmail } from "@/lib/email";

// POST: send a test e-mail to the signed-in admin and say exactly what
// happened, so alert e-mail problems can be found from the Settings tab.
export async function POST() {
  const blocked = await requireAccess("admin");
  if (blocked) return blocked;
  const viewer = await getViewer();
  const setup = await (await getBackend()).getSetup();
  const to = viewer?.email;
  if (!to) return Response.json({ ok: false, error: "No e-mail address to send to" }, { status: 400 });

  const out = await sendEmail({
    to: [to],
    subject: "TWELVE test e-mail",
    text: `This is a test from TWELVE (${setup.school.name}). If you can read this, alert e-mails reach you.`,
    html: `<div style="font-family:system-ui,sans-serif"><h2 style="margin:0 0 8px">TWELVE test e-mail</h2><p>This is a test from TWELVE (${setup.school.name.replace(/[<>&]/g, "")}). If you can read this, alert e-mails reach you.</p></div>`,
  });
  return Response.json(
    out.sent
      ? { ok: true, message: `Sent to ${to}. It should arrive within a minute (check Spam too).` }
      : { ok: false, error: `Not sent: ${out.reason}` },
  );
}
