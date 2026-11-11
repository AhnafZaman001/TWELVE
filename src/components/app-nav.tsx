"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ADMIN_TABS, hashFor, onHashChange, placeFromHash } from "@/lib/admin-tabs";

// The one top bar for the principal's side: the live board and every admin
// tab in one row, who is signed in, and Sign out. Each item is a real link,
// so the browser's Back button moves between them. Moving between pages here
// is an in-app move, so it does not ask for a new sign-in (see proxy.ts).
export function AppNav(props: { canAdmin: boolean; email: string | null }) {
  const path = usePathname();
  const hash = useSyncExternalStore(onHashChange, () => window.location.hash, () => "");
  const tab = path === "/admin" ? placeFromHash(hash)[0] : null;

  const links = [
    { href: "/board", label: "Live board", current: path === "/board" },
    ...(props.canAdmin
      ? ADMIN_TABS.map((t) => ({ href: `/admin#${hashFor(t)}`, label: t, current: tab === t }))
      : []),
  ];

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 border-b border-line bg-background/95 backdrop-blur print:hidden"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-8">
        <Link href="/board" className="shrink-0 font-semibold tracking-widest">
          TWELVE
        </Link>
        <ul className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1">
          {links.map((l) => (
            <li key={l.href} className="shrink-0">
              {/* on the same page a plain #link switches the admin tab; another page is an in-app move */}
              {l.href.split("#")[0] === path ? (
                <a href={l.href} aria-current={l.current ? "page" : undefined} className={linkClass(l.current)}>
                  {l.label}
                </a>
              ) : (
                <Link href={l.href} aria-current={l.current ? "page" : undefined} className={linkClass(l.current)}>
                  {l.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {props.email && (
          <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
            <span className="hidden max-w-48 truncate lg:inline">{props.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="min-h-8 rounded-lg border border-line px-2 hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}

const linkClass = (current: boolean) =>
  `inline-flex min-h-9 items-center rounded-lg px-3 font-medium ${
    current ? "bg-foreground text-background" : "text-muted hover:text-foreground"
  }`;
