import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session";

// Route guard for the authenticated area of the app. Only checks that a
// session cookie is *present* — the backend is the source of truth for
// whether the JWT is actually valid/unexpired, and every /companies/**
// call already handles a 401 from the API by redirecting to /connexion
// (see lib/api.ts#apiFetch). This proxy just avoids rendering a page that
// we already know will fail because there's no cookie at all.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /entreprises/nouvelle is the registration flow — it must stay reachable
  // without a session (that's how a new account is created in the first place).
  if (pathname === "/entreprises/nouvelle" || pathname.startsWith("/entreprises/nouvelle/")) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/entreprises/:path*"],
};
