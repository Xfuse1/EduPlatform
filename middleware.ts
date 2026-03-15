import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const RESERVED_SUBDOMAINS = new Set(['www', 'app'])

function normalizeHost(host: string) {
  return host
    .trim()
    .toLowerCase()
    .split(',')[0]
    ?.trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
}

function extractSubdomain(host: string) {
  const normalizedHost = normalizeHost(host)
  const hostname = normalizedHost.split(':')[0]

  if (!hostname || hostname === 'localhost') {
    return null
  }

  if (hostname.endsWith('.localhost')) {
    const slug = hostname.replace(/\.localhost$/, '')
    return slug || null
  }

  const parts = hostname.split('.').filter(Boolean)

  if (parts.length < 3) {
    return null
  }

  return parts[0] ?? null
}

function buildRewritePath(group: string, pathname: string) {
  return pathname === '/' ? group : `${group}${pathname}`
}

function withTenantHeader(request: NextRequest, tenantSlug?: string) {
  const requestHeaders = new Headers(request.headers)

  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  } else {
    requestHeaders.delete('x-tenant-slug')
  }

  return requestHeaders
}

function rewriteToGroup(request: NextRequest, group: string, tenantSlug?: string) {
  const url = request.nextUrl.clone()
  url.pathname = buildRewritePath(group, request.nextUrl.pathname)

  return NextResponse.rewrite(url, {
    request: {
      headers: withTenantHeader(request, tenantSlug),
    },
  })
}

function continueRequest(request: NextRequest, tenantSlug?: string) {
  return NextResponse.next({
    request: {
      headers: withTenantHeader(request, tenantSlug),
    },
  })
}

export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''

  const subdomain = extractSubdomain(host)
  const isRootRequest = request.nextUrl.pathname === '/'

  if (!subdomain || subdomain === 'www') {
    return isRootRequest ? continueRequest(request) : rewriteToGroup(request, '/(marketing)')
  }

  if (subdomain === 'app') {
    return rewriteToGroup(request, '/(platform-admin)')
  }

  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next()
  }

  return isRootRequest
    ? continueRequest(request, subdomain)
    : rewriteToGroup(request, '/(tenant)', subdomain)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\..*).*)',
  ],
}
