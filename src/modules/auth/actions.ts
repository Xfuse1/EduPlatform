'use server'

import { randomBytes, randomInt } from 'node:crypto'

import { db } from '@/lib/db'
import { revokeAuthSession } from '@/lib/auth'

import {
  findAuthUserByPhone,
  getDashboardRouteForRole,
  getLatestActiveOtp,
} from './queries'
import {
  sendOtpSchema,
  verifyOtpSchema,
  type SendOtpInput,
  type VerifyOtpInput,
} from './validations'

const OTP_EXPIRES_IN_MS = 1000 * 60 * 5
const OTP_MAX_ATTEMPTS = 5
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30

function createOtpCode() {
  return randomInt(100000, 1_000_000).toString()
}

function createSessionToken() {
  return randomBytes(32).toString('hex')
}

export async function sendOtp(
  tenantId: string,
  input: SendOtpInput | Record<string, unknown>,
) {
  const data = sendOtpSchema.parse(input)
  const user = await findAuthUserByPhone(tenantId, data.phone)

  if (!user) {
    throw new Error('هذا الرقم غير مسجل داخل المؤسسة')
  }

  await db.oTP.updateMany({
    where: {
      phone: data.phone,
      used: false,
    },
    data: {
      used: true,
    },
  })

  const otp = await db.oTP.create({
    data: {
      phone: data.phone,
      code: createOtpCode(),
      expiresAt: new Date(Date.now() + OTP_EXPIRES_IN_MS),
    },
  })

  return {
    phone: data.phone,
    expiresAt: otp.expiresAt,
    ...(process.env.NODE_ENV !== 'production'
      ? {
          debugCode: otp.code,
        }
      : {}),
  }
}

export async function verifyOtp(
  tenantId: string,
  input: VerifyOtpInput | Record<string, unknown>,
) {
  const data = verifyOtpSchema.parse(input)
  const [user, otp] = await Promise.all([
    findAuthUserByPhone(tenantId, data.phone),
    getLatestActiveOtp(data.phone),
  ])

  if (!user) {
    throw new Error('هذا الرقم غير مسجل داخل المؤسسة')
  }

  if (!otp || otp.expiresAt <= new Date()) {
    throw new Error('رمز التحقق غير صالح أو انتهت صلاحيته')
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error('تم تجاوز عدد محاولات التحقق المسموح بها')
  }

  if (otp.code !== data.code) {
    await db.oTP.update({
      where: {
        id: otp.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    })

    throw new Error('رمز التحقق غير صحيح')
  }

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  const session = await db.$transaction(async (tx) => {
    await tx.oTP.update({
      where: {
        id: otp.id,
      },
      data: {
        used: true,
        attempts: {
          increment: 1,
        },
      },
    })

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    })

    return tx.authSession.create({
      data: {
        userId: user.id,
        tenantId,
        token: createSessionToken(),
        refreshToken: createSessionToken(),
        expiresAt,
      },
    })
  })

  return {
    user,
    session,
    redirectTo: getDashboardRouteForRole(user.role),
  }
}

export async function logout(sessionToken: string | null) {
  await revokeAuthSession(sessionToken)
}
