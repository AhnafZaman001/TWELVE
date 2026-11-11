// Runs before every page request.
// 1. Keeps the sign-in session fresh (Supabase may rotate its cookie, and pages
//    cannot write cookies themselves).
// 2. "Sign in every time": opening TWELVE's protected pages (the board, admin,
//    any room QR) from outside needs a fresh sign-in. A sign-in hands out one
//    entry pass (lib/entry-pass.ts); opening a page uses it up. Without one the
//    old sign-in cookies are removed and the person goes to the sign-in page.
//    Moving between those pages inside TWELVE (Live board ↔ Admin, Try it)
//    does not ask again.
// Who may see what is still checked in the pages and API routes (lib/auth.ts).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ENTRY_COOKIE, isValidEntryPass } from "./lib/entry-pass";

const PROTECTED = /^\/(board|admin|demo|r\/[^/]+)\/?$/;

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next(); // sample mode: no sign-in at all

  const path = request.nextUrl.pathname;
  if (request.method === "GET" && PROTECTED.test(path)) {
    const entering = isEntering(request);
    if (entering) {
      if (await isValidEntryPass(request.cookies.get(ENTRY_COOKIE)?.value)) {
        const response = await refreshSession(request, url, key);
        response.cookies.delete(ENTRY_COOKIE); // one pass, one entry
        return response;
      }
      return toSignIn(request, path);
    }
  }
  return refreshSession(request, url, key);
}

// Is this someone opening TWELVE, rather than moving inside it?
// Browsers mark a real page load (scan, typed link, refresh, new tab) with
// Sec-Fetch-Mode "navigate"; an in-app move is a background fetch. (Next.js
// hides its own markers for these fetches from the proxy, so this is the
// reliable signal.) A fetch only counts as an in-app move when it comes from
// a page that is itself protected.
function isEntering(request: NextRequest) {
  if (!isInAppFetch(request)) return true;
  const from = request.headers.get("referer");
  if (!from) return true;
  try {
    const ref = new URL(from);
    return ref.origin !== request.nextUrl.origin || !PROTECTED.test(ref.pathname);
  } catch {
    return true;
  }
}

function isInAppFetch(request: NextRequest) {
  const mode = request.headers.get("sec-fetch-mode");
  return mode !== null && mode !== "navigate";
}

// Send to the sign-in page and forget the old sign-in (Supabase keeps it in
// "sb-…" cookies). A background fetch (e.g. a prefetch) only gets the
// redirect: it must not sign anyone out.
function toSignIn(request: NextRequest, path: string) {
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
  const response = NextResponse.redirect(login);
  response.headers.set("x-twelve-entry", "sign-in-needed"); // tells this redirect apart from a page's own
  if (!isInAppFetch(request)) {
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith("sb-")) response.cookies.delete(c.name);
    }
  }
  return response;
}

async function refreshSession(request: NextRequest, url: string, key: string) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
