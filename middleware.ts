import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { extractSubdomain, extractTenantSlug, normalizeHost } from '@/lib/tenant-host'

function buildRewritePath(group: string, pathname: string) {
  return pathname === '/' ? group : `${group}${pathname}`
}

function rewriteToGroup(request: NextRequest, group: string) {
  const url = request.nextUrl.clone()
  url.pathname = buildRewritePath(group, request.nextUrl.pathname)

  return NextResponse.rewrite(url)
}

export function middleware(request: NextRequest) {
  const host = normalizeHost(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '',
  )

  const subdomain = extractSubdomain(host)
  const tenantSlug = extractTenantSlug(host)

  if (!subdomain || subdomain === 'www') {
    return request.nextUrl.pathname === '/'
      ? NextResponse.next()
      : rewriteToGroup(request, '/(marketing)')
  }

  if (subdomain === 'app') {
    return rewriteToGroup(request, '/(platform-admin)')
  }

  if (!tenantSlug) {
    return request.nextUrl.pathname === '/'
      ? NextResponse.next()
      : rewriteToGroup(request, '/(marketing)')
  }

  return request.nextUrl.pathname === '/'
    ? NextResponse.next()
    : rewriteToGroup(request, '/(tenant)')
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\..*).*)',
  ],
}
