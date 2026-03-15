import type { Tenant } from '@prisma/client'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { db } from '@/lib/db'

const CACHE_TTL_SECONDS = 60 * 60
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api'])

type CachedTenant = Omit<Tenant, 'planExpiresAt' | 'createdAt' | 'updatedAt'> & {
  planExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

function normalizeHost(host: string) {
  return host
    .trim()
    .toLowerCase()
    .split(',')[0]
    ?.trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
}

function extractTenantSlug(host: string) {
  const normalizedHost = normalizeHost(host)

  if (!normalizedHost || normalizedHost === 'localhost') {
    return null
  }

  if (normalizedHost.endsWith('.localhost')) {
    const slug = normalizedHost.replace(/\.localhost$/, '')
    return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null
  }

  const parts = normalizedHost.split('.').filter(Boolean)

  if (parts.length < 3) {
    return null
  }

  const slug = parts[0]
  return RESERVED_SUBDOMAINS.has(slug) ? null : slug
}

function canUseRedisCache() {
  return Boolean(
    process.env.REDIS_URL &&
      process.env.REDIS_TOKEN &&
      process.env.REDIS_URL.startsWith('http'),
  )
}

function getRedisHeaders() {
  return {
    Authorization: `Bearer ${process.env.REDIS_TOKEN}`,
  }
}

function serializeTenant(tenant: Tenant) {
  const cachedTenant: CachedTenant = {
    ...tenant,
    planExpiresAt: tenant.planExpiresAt?.toISOString() ?? null,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  }

  return JSON.stringify(cachedTenant)
}

function deserializeTenant(payload: string) {
  try {
    const tenant = JSON.parse(payload) as CachedTenant

    return {
      ...tenant,
      planExpiresAt: tenant.planExpiresAt ? new Date(tenant.planExpiresAt) : null,
      createdAt: new Date(tenant.createdAt),
      updatedAt: new Date(tenant.updatedAt),
    } satisfies Tenant
  } catch {
    return null
  }
}

async function getCachedTenant(slug: string) {
  if (!canUseRedisCache()) {
    return null
  }

  try {
    const response = await fetch(
      `${process.env.REDIS_URL}/get/${encodeURIComponent(`tenant:${slug}`)}`,
      {
        headers: getRedisHeaders(),
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { result?: string | null }

    if (!payload.result || typeof payload.result !== 'string') {
      return null
    }

    return deserializeTenant(payload.result)
  } catch {
    return null
  }
}

async function setCachedTenant(slug: string, tenant: Tenant) {
  if (!canUseRedisCache()) {
    return
  }

  try {
    await fetch(
      `${process.env.REDIS_URL}/setex/${encodeURIComponent(`tenant:${slug}`)}/${CACHE_TTL_SECONDS}/${encodeURIComponent(serializeTenant(tenant))}`,
      {
        headers: getRedisHeaders(),
        cache: 'no-store',
      },
    )
  } catch {
    // Cache failures should not block tenant resolution.
  }
}

async function getTenantBySlug(slug: string) {
  const cachedTenant = await getCachedTenant(slug)

  if (cachedTenant) {
    return cachedTenant
  }

  const tenant = await db.tenant.findUnique({
    where: { slug },
  })

  if (tenant) {
    await setCachedTenant(slug, tenant)
  }

  return tenant
}

async function getRequestHost(req?: NextRequest) {
  if (req) {
    return req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  }

  const requestHeaders = await headers()
  return requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
}

async function getRequestTenantSlug(req?: NextRequest) {
  if (req) {
    return req.headers.get('x-tenant-slug')
  }

  const requestHeaders = await headers()
  return requestHeaders.get('x-tenant-slug')
}

export async function getTenantFromHost(host: string) {
  const slug = extractTenantSlug(host)

  if (!slug) {
    return null
  }

  return getTenantBySlug(slug)
}

export async function requireTenant(req?: NextRequest) {
  const requestTenantSlug = await getRequestTenantSlug(req)
  const tenant = requestTenantSlug
    ? await getTenantBySlug(requestTenantSlug)
    : await getTenantFromHost((await getRequestHost(req)) ?? '')

  if (!tenant) {
    notFound()
  }

  return tenant
}
