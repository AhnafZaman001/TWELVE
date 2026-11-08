import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { TwelveDial } from "@/components/twelve-dial";
import { authEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in · TWELVE" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <TwelveDial accent="var(--accent)" ink="var(--foreground)" inner={0.46} className="w-32">
          <span className="text-3xl font-bold text-accent tabular-nums">12</span>
        </TwelveDial>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to TWELVE</h1>
          <p className="mt-1 text-sm text-muted">Only staff added by your school can sign in.</p>
        </div>
      </div>
      {authEnabled ? (
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      ) : (
        <p className="rounded-2xl border border-line p-4 text-center text-sm text-muted">
          Sign-in needs Supabase. This local copy runs on sample data and is open without signing in.
        </p>
      )}
    </main>
  );
}
