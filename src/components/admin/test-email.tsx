"use client";

import { useState } from "react";

// Settings → send yourself a test e-mail and see exactly what happened.
export function TestEmail() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/test-email", { method: "POST" });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not reach the server" }));
    setBusy(false);
    setResult(out.ok ? { ok: true, text: out.message } : { ok: false, text: out.error });
  }

  return (
    <section className="flex max-w-xl flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
      <div>
        <h2 className="text-xl font-semibold">Alert e-mails</h2>
        <p className="text-muted">
          Alerts come from twelve@keystonelabs.site to admins with “Alert e-mails” on (People → Admins). Send yourself a test
          to check they arrive.
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="min-h-10 self-start rounded-xl border border-line px-4 font-semibold hover:border-foreground disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send me a test e-mail"}
      </button>
      {result && <p className={result.ok ? "text-accent" : "text-danger"}>{result.text}</p>}
    </section>
  );
}
