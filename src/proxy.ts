import { NextRequest, NextResponse } from "next/server";

const IGNORED_SUBDOMAINS = new Set(["www", "app", "api", "localhost", ""]);

// Defense-in-depth: page prefixes that require an authenticated session cookie.
// Full validation (token lookup, role, tenant) still happens in each page/route;
// this only stops unauthenticated traffic from reaching protected pages.
const AUTH_COOKIES = ["auth-token", "eduplatform-session"];
const PROTECTED_PAGE_PREFIXES = [
  "/teacher",
  "/student",
  "/parent",
  "/center",
  "/admin",
  "/payments",
  "/attendance",
  "/messages",
  "/notifications",
  "/schedule",
];

function extractSubdomain(host: string): string {
  const hostname = host.split(":")[0] ?? "";

  if (hostname.endsWith(".vercel.app")) {
    return "";
  }

  if (hostname.endsWith(".localhost")) {
    return hostname.replace(".localhost", "");
  }
  const parts = hostname.split(".");
  return parts.length > 2 ? (parts[0] ?? "") : "";
}

function hasSessionCookie(request: NextRequest) {
  return AUTH_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);
  const pathname = request.nextUrl.pathname;

  // Gate protected pages on session-cookie presence (defense-in-depth).
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtectedPage && !hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("next-url", pathname);

  if (!IGNORED_SUBDOMAINS.has(subdomain)) {
    requestHeaders.set("x-tenant-slug", subdomain);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
