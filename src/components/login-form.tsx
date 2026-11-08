"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase/browser";

const ERRORS: Record<string, string> = {
  "not-invited": "That account is not on your school's staff list. Ask the admin to add your email.",
  failed: "Sign-in did not finish. Please try again.",
};

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const [error, setError] = useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function google() {
    setBusy(true);
    const { error } = await createBrowserAuthClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setBusy(false);
      setError("Google sign-in is not available right now.");
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/email-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const out = await res.json().catch(() => ({ ok: false, error: "Could not send the code" }));
    setBusy(false);
    if (!out.ok) return setError(out.error);
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createBrowserAuthClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) return setError("That code is wrong or has expired.");
    router.replace(next);
    router.refresh();
  }

  const field = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-foreground";
  const button = "min-h-12 w-full rounded-xl font-semibold disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-xl border border-danger/50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button type="button" disabled={busy} onClick={() => void google()} className={`${button} bg-foreground text-background`}>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or get a code by email
        <span className="h-px flex-1 bg-line" />
      </div>

      {!sent ? (
        <form onSubmit={(e) => void sendCode(e)} className="flex flex-col gap-3">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <button type="submit" disabled={busy} className={`${button} border border-line`}>
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void verify(e)} className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            If <span className="text-foreground">{email}</span> is on the staff list, a 6-digit code is on its way.
          </p>
          <label htmlFor="code" className="sr-only">
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className={`${field} text-center text-2xl tracking-[0.4em]`}
          />
          <button type="submit" disabled={busy || code.length < 6} className={`${button} bg-accent text-accent-ink`}>
            Sign in
          </button>
          <button type="button" onClick={() => setSent(false)} className="text-sm text-muted underline underline-offset-4">
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
