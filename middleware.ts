import { NextResponse, type NextRequest } from "next/server";

/**
 * Defense-in-depth auth gate.
 *
 * This is intentionally a cheap, edge-safe check: it only verifies that a
 * session cookie is PRESENT for protected routes. Full validation (token
 * lookup, role checks, tenant scoping) still happens in each route/page via
 * requireAuth / requireRole / requireTenant — middleware cannot reach the DB
 * on the edge runtime. The goal is to stop unauthenticated traffic from ever
 * reaching protected handlers, so a single forgotten guard is no longer a full
 * bypass.
 */

const AUTH_COOKIES = ["auth-token", "eduplatform-session"];

// Page path prefixes that require an authenticated session.
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

// API prefixes that are intentionally public (no session cookie required).
const PUBLIC_API_PREFIXES = [
  "/api/auth", // login / otp / session / logout
  "/api/public", // public registration & group listing
  "/api/payments/kashier", // external gateway webhook + callback (signature-verified)
];

function hasSessionCookie(request: NextRequest) {
  return AUTH_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApi = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const needsAuth = (isApi && !isPublicApi) || isProtectedPage;
  if (!needsAuth || hasSessionCookie(request)) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" } },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
