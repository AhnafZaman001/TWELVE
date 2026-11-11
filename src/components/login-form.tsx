"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase/browser";

const ERRORS: Record<string, string> = {
  "not-invited": "That account is not on your school's staff list. Ask the admin to add your email.",
  failed: "Sign-in did not finish. Please try again.",
};

type Mode = "password" | "code";

// Three ways in: email + password (set one in Settings), Google, or a
// 6-digit code by e-mail. Every way ends with the same server check
// (/api/auth/after-sign-in): unlisted emails are signed out again, and an
// admin's sign-in is e-mailed.
export function LoginForm() {
  const params = useSearchParams();
  const raw = params.get("next") ?? "/board";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/board";
  const [error, setError] = useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const cleanEmail = () => email.trim().toLowerCase();

  // The server check after a password or code sign-in
  async function finish() {
    const res = await fetch("/api/auth/after-sign-in", { method: "POST" });
    const out = await res.json().catch(() => ({ ok: false, error: "failed" }));
    if (!out.ok) {
      setBusy(false);
      return setError(ERRORS[out.error] ?? ERRORS.failed);
    }
    // a full page load, so the entry pass from this sign-in is used right away
    window.location.assign(next);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createBrowserAuthClient().auth.signInWithPassword({ email: cleanEmail(), password });
    if (error) {
      setBusy(false);
      return setError(
        error.status === 429
          ? "Too many tries. Wait a few minutes and try again."
          : "Wrong email or password. No password yet? Use Google or a code by email, then set one in Settings.",
      );
    }
    await finish();
  }

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
      email: cleanEmail(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      return setError("That code is wrong or has expired.");
    }
    await finish();
  }

  const field = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-foreground";
  const button = "min-h-12 w-full rounded-xl font-semibold disabled:opacity-50";
  const emailInput = (
    <>
      <label htmlFor="email" className="sr-only">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="username"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={field}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-xl border border-danger/50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {mode === "password" ? (
        <form onSubmit={(e) => void signInWithPassword(e)} className="flex flex-col gap-3">
          {emailInput}
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-2 min-h-9 -translate-y-1/2 rounded-lg px-2 text-xs text-muted hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" disabled={busy} className={`${button} bg-accent text-accent-ink`}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : !sent ? (
        <form onSubmit={(e) => void sendCode(e)} className="flex flex-col gap-3">
          {emailInput}
          <button type="submit" disabled={busy} className={`${button} bg-accent text-accent-ink`}>
            Send me a code
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

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <button type="button" disabled={busy} onClick={() => void google()} className={`${button} bg-foreground text-background`}>
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "password" ? "code" : "password");
          setSent(false);
          setError(null);
        }}
        className={`${button} border border-line`}
      >
        {mode === "password" ? "Get a code by email instead" : "Use email and password instead"}
      </button>
    </div>
  );
}
