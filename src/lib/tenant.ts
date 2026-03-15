import type { Tenant } from '@prisma/client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { env } from '@/config/env'
import { getCacheValue, setCacheValue } from '@/lib/cache'
import { db } from '@/lib/db'

const CACHE_TTL_SECONDS = 60 * 60
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api'])

type CachedTenant = Omit<Tenant, 'planExpiresAt' | 'createdAt' | 'updatedAt'> & {
  planExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export class TenantNotFoundError extends Error {
  constructor(message = 'المؤسسة غير موجودة') {
    super(message)
    this.name = 'TenantNotFoundError'
  }
}

export class InactiveTenantError extends Error {
  tenantSlug: string

  constructor(tenantSlug: string, message = 'المؤسسة غير مفعلة') {
    super(message)
    this.name = 'InactiveTenantError'
    this.tenantSlug = tenantSlug
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

export function normalizeHost(host: string) {
  return host
    .trim()
    .toLowerCase()
    .split(',')[0]
    ?.trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
}

export function extractSubdomain(host: string) {
  const normalizedHost = normalizeHost(host)

  if (!normalizedHost || normalizedHost === 'localhost') {
    return null
  }

  if (normalizedHost.endsWith('.localhost')) {
    return normalizedHost.replace(/\.localhost$/, '') || null
  }

  const parts = normalizedHost.split('.').filter(Boolean)

  if (parts.length < 3) {
    return null
  }

  return parts[0] ?? null
}

export function extractTenantSlug(host: string) {
  const slug = extractSubdomain(host)

  if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
    return null
  }

  return slug
}

async function getCachedTenant(slug: string) {
  const payload = await getCacheValue(`tenant:${slug}`)

  if (!payload || typeof payload !== 'string') {
    return null
  }

  return deserializeTenant(payload)
}

async function setCachedTenant(slug: string, tenant: Tenant) {
  await setCacheValue(`tenant:${slug}`, serializeTenant(tenant), CACHE_TTL_SECONDS)
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

export async function getRequestHost(req?: NextRequest) {
  if (req) {
    return req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  }

  const requestHeaders = await headers()
  return requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
}

function getMarketingRedirectUrl(pathname = '/') {
  return new URL(pathname, env.NEXT_PUBLIC_APP_URL).toString()
}

async function resolveTenantRecord(host: string) {
  const slug = extractTenantSlug(host)

  if (!slug) {
    throw new TenantNotFoundError()
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant) {
    throw new TenantNotFoundError()
  }

  if (!tenant.isActive) {
    throw new InactiveTenantError(tenant.slug)
  }

  return tenant
}

export async function getTenantFromHost(host: string) {
  try {
    return await resolveTenantRecord(host)
  } catch {
    return null
  }
}

export async function requireTenant(req?: NextRequest) {
  const host = (await getRequestHost(req)) ?? ''

  try {
    return await resolveTenantRecord(host)
  } catch (error) {
    if (req) {
      throw error
    }

    if (error instanceof InactiveTenantError) {
      redirect(getMarketingRedirectUrl(`/inactive?slug=${error.tenantSlug}`))
    }

    if (error instanceof TenantNotFoundError) {
      redirect(getMarketingRedirectUrl('/'))
    }

    throw error
  }
}
