import { NextRequest, NextResponse } from "next/server";

const IGNORED_SUBDOMAINS = new Set(["www", "app", "api", "localhost", ""]);

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

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);
  const pathname = request.nextUrl.pathname;

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
