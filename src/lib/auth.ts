import { randomBytes } from 'node:crypto'

import type { AuthSession, User } from '@prisma/client'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest, NextResponse } from 'next/server'

import { ROUTES } from '@/config/routes'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'

export const SESSION_COOKIE_NAME = 'session-token'
const SESSION_COOKIE_NAMES = [SESSION_COOKIE_NAME, 'auth-token', 'token'] as const
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30

export class UnauthorizedError extends Error {
  constructor(message = 'يرجى تسجيل الدخول') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()
  return token || null
}

export async function getSessionToken(req?: NextRequest) {
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

function createSessionToken() {
  return randomBytes(32).toString('hex')
}

export async function createAuthSession(userId: string, tenantId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  const session = await db.authSession.create({
    data: {
      userId,
      tenantId,
      token: createSessionToken(),
      refreshToken: createSessionToken(),
      expiresAt,
    },
  })

  return session
}

export function applySessionCookie(
  response: NextResponse,
  session: Pick<AuthSession, 'token' | 'expiresAt'>,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: session.expiresAt,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function revokeAuthSession(token: string | null) {
  if (!token) {
    return
  }

  await db.authSession.deleteMany({
    where: {
      token,
    },
  })
}

export async function getCurrentSession(req?: NextRequest) {
  const tenant = await requireTenant(req)
  const token = await getSessionToken(req)

  if (!token) {
    return null
  }

  return db.authSession.findFirst({
    where: {
      token,
      tenantId: tenant.id,
      expiresAt: {
        gt: new Date(),
      },
    },
  })
}

async function getCurrentUserForTenant(tenantId: string, req?: NextRequest) {
  const token = await getSessionToken(req)

  if (!token) {
    return null
  }

  const session = await db.authSession.findFirst({
    where: {
      token,
      tenantId,
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  if (!session) {
    return null
  }

  return db.user.findFirst({
    where: {
      id: session.userId,
      tenantId,
      isActive: true,
    },
  })
}

export async function requireAuth(req?: NextRequest): Promise<User> {
  const tenant = await requireTenant(req)
  const user = await getCurrentUserForTenant(tenant.id, req)

  if (!user) {
    throw new UnauthorizedError()
  }

  return user
}

export async function requireDashboardUser(req?: NextRequest) {
  try {
    return await requireAuth(req)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect(ROUTES.auth.login)
    }

    throw error
  }
}

export async function getCurrentUser(req?: NextRequest) {
  try {
    const tenant = await requireTenant(req)
    return await getCurrentUserForTenant(tenant.id, req)
  } catch {
    return null
  }
}
