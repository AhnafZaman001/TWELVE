"use client";

import { useState } from "react";
import { field } from "./tile-kit";

// Settings → set or change your own password, so you can sign in with
// email and password (no Google needed).
export function AccountPassword() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const mismatch = again.length > 0 && again !== password;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not set the password" }));
    setBusy(false);
    setMessage(out.ok ? { ok: true, text: "Password saved. You can now sign in with your email and this password." } : { ok: false, text: out.error });
    if (out.ok) {
      setPassword("");
      setAgain("");
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex max-w-xl flex-col gap-3 rounded-2xl border border-line p-4 text-sm">
      <div>
        <h2 className="text-xl font-semibold">Your password</h2>
        <p className="text-muted">
          Set a password to sign in with your email and password instead of Google. Every admin sign-in is e-mailed to you
          and to the admins with alert e-mails on.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          New password
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          Type it again
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            className={field}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-muted">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4" />
        Show password
      </label>
      {mismatch && <p className="text-danger">The two passwords are different.</p>}
      {message && <p className={message.ok ? "text-accent" : "text-danger"}>{message.text}</p>}
      <button
        type="submit"
        disabled={busy || password.length < 8 || mismatch}
        className="min-h-10 self-start rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
