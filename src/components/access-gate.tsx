import { redirect } from "next/navigation";
import { authEnabled, canAccess, getViewer, type Access } from "@/lib/auth";
import { AppNav } from "./app-nav";

// Server-side check for admin pages: not signed in -> login page; signed in but
// not an admin -> a clear "no access" message. Open when sign-in is off (sample mode).
export async function AccessGate(props: { level: Access; next: string; children: React.ReactNode }) {
  if (!authEnabled) {
    return (
      <>
        <AppNav canAdmin email={null} />
        {props.children}
      </>
    );
  }
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(props.next)}`);
  if (!canAccess(viewer, props.level)) {
    return (
      <NoAccess email={viewer.email}>
        {viewer.admin
          ? "Coordinators can see the live board but not the admin screen."
          : "This page is for the principal and coordinators."}
      </NoAccess>
    );
  }
  return (
    <>
      <AppNav canAdmin={canAccess(viewer, "admin")} email={viewer.email} />
      {props.children}
    </>
  );
}

export function NoAccess(props: { email: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">No access</h1>
      <p className="text-muted">{props.children}</p>
      <p className="text-sm text-muted">
        Signed in as <span className="text-foreground">{props.email}</span>
      </p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="min-h-11 w-full rounded-xl border border-line font-semibold">
          Sign in with another account
        </button>
      </form>
    </main>
  );
}
