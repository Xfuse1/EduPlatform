import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const RESERVED_SUBDOMAINS = new Set(['', 'www', 'app', 'localhost'])
const INTERNAL_ROUTE_GROUP_PREFIXES = ['/(marketing)', '/(tenant)', '/(platform-admin)']
const PLATFORM_HOST_SUFFIXES = ['.vercel.app', '.vercel.sh']

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

function getHostname(host: string) {
  return normalizeHost(host).split(':')[0] ?? ''
}

function isPlatformDeploymentHost(host: string) {
  const hostname = getHostname(host)
  return PLATFORM_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}

function isInternalGroupPath(pathname: string) {
  return INTERNAL_ROUTE_GROUP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function extractSubdomain(host: string) {
  const hostname = getHostname(host)
  const parts = hostname.split('.')

  if (!hostname || hostname === 'localhost' || isPlatformDeploymentHost(hostname)) {
    return ''
  }

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
  try {
    if (isInternalGroupPath(request.nextUrl.pathname)) {
      return NextResponse.next()
    }

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
      return request.nextUrl.pathname === '/'
        ? NextResponse.next()
        : rewriteToGroup(request, '/(marketing)')
    }

    if (!tenantSlug) {
      return request.nextUrl.pathname === '/'
        ? NextResponse.next()
        : rewriteToGroup(request, '/(marketing)')
    }

    return rewriteToGroup(request, '/(tenant)')
  } catch (error) {
    console.error('[middleware]', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\..*).*)',
  ],
}
