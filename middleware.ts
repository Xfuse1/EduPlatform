import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const RESERVED_SUBDOMAINS = new Set(['', 'www', 'app', 'localhost'])

function normalizeHost(host: string) {
  return (
    host
      .trim()
      .toLowerCase()
      .split(',')[0]
      ?.trim()
      .replace(/^https?:\/\//, '')
      .split('/')[0] ?? ''
  )
}

function extractSubdomain(host: string) {
  const hostname = normalizeHost(host).split(':')[0]
  const parts = hostname.split('.')

  if (hostname.endsWith('.localhost')) {
    return parts[0] ?? ''
  }

  if (parts.length > 2) {
    return parts[0] ?? ''
  }

  return ''
}

function extractTenantSlug(host: string) {
  const subdomain = extractSubdomain(host)
  return RESERVED_SUBDOMAINS.has(subdomain) ? '' : subdomain
}

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
