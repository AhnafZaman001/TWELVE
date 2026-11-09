import { redirect } from "next/navigation";
import { authEnabled, canAccess, getViewer, type Access } from "@/lib/auth";

// Server-side check for admin pages: not signed in -> login page; signed in but
// not an admin -> a clear "no access" message. Open when sign-in is off (sample mode).
export async function AccessGate(props: { level: Access; next: string; children: React.ReactNode }) {
  if (!authEnabled) {
    return (
      <>
        <AppNav current={props.next} canAdmin email={null} />
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
      <AppNav current={props.next} canAdmin={canAccess(viewer, "admin")} email={viewer.email} />
      {props.children}
    </>
  );
}

// Top bar on the board and admin pages: move between them, see who is signed in, sign out.
export function AppNav(props: { current: string; canAdmin: boolean; email: string | null }) {
  const links = [
    { href: "/board", label: "Live board" },
    ...(props.canAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/", label: "Home" },
  ];
  return (
    <nav
      aria-label="Main"
      className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 text-sm sm:px-8 print:hidden"
    >
      <span className="font-semibold tracking-widest">TWELVE</span>
      <ul className="flex flex-wrap gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              aria-current={props.current === l.href ? "page" : undefined}
              className={`inline-flex min-h-9 items-center rounded-lg px-3 font-medium ${
                props.current === l.href ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      {props.email && (
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span className="max-w-48 truncate">{props.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="min-h-8 rounded-lg border border-line px-2 hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      )}
    </nav>
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
