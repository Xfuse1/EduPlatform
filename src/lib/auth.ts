import type { User } from '@prisma/client'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'

import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'

const SESSION_COOKIE_NAMES = ['session-token', 'auth-token', 'token'] as const

function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()
  return token || null
}

async function getSessionToken(req?: NextRequest) {
  if (req) {
    return (
      extractBearerToken(req.headers.get('authorization')) ??
      req.headers.get('x-session-token') ??
      SESSION_COOKIE_NAMES.map((name) => req.cookies.get(name)?.value).find(Boolean) ??
      null
    )
  }

  const requestHeaders = await headers()
  const cookieStore = await cookies()

  return (
    extractBearerToken(requestHeaders.get('authorization')) ??
    requestHeaders.get('x-session-token') ??
    SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).find(Boolean) ??
    null
  )
}

function throwUnauthorized(): never {
  throw new Error('يرجى تسجيل الدخول')
}

export async function requireAuth(req?: NextRequest): Promise<User> {
  const tenant = await requireTenant(req)
  const token = await getSessionToken(req)

  if (!token) {
    throwUnauthorized()
  }

  const session = await db.authSession.findFirst({
    where: {
      token,
      tenantId: tenant.id,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      userId: true,
    },
  })

  if (!session) {
    throwUnauthorized()
  }

  const user = await db.user.findFirst({
    where: {
      id: session.userId,
      tenantId: tenant.id,
      isActive: true,
    },
  })

  if (!user) {
    throwUnauthorized()
  }

  return user
}

export async function getCurrentUser(req?: NextRequest) {
  try {
    return await requireAuth(req)
  } catch {
    return null
  }
}
