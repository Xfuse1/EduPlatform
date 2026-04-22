import { NextRequest } from 'next/server'

import { env } from '@/config/env'
import { db } from '@/lib/db'
import { errorResponse, successResponse } from '@/lib/api-response'

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-internal-jobs-secret')
  return !!env.INTERNAL_JOBS_SECRET && token === env.INTERNAL_JOBS_SECRET
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return errorResponse('UNAUTHORIZED', 'Invalid jobs secret', 401)
  }

  const now = new Date()
  const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const expiring = await db.teacherSubscription.findMany({
    where: {
      isActive: true,
      nextBillingAt: {
        gte: now,
        lte: threshold,
      },
    },
    select: {
      id: true,
      tenantId: true,
      nextBillingAt: true,
    },
  })

  let created = 0

  for (const subscription of expiring) {
    const teacher = await db.user.findFirst({
      where: {
        tenantId: subscription.tenantId,
        role: 'TEACHER',
      },
      select: { id: true, phone: true },
    })

    if (!teacher) continue

    await db.notification.create({
      data: {
        tenantId: subscription.tenantId,
        userId: teacher.id,
        type: 'PAYMENT_REMINDER',
        message: `Subscription renewal is due on ${subscription.nextBillingAt.toISOString().slice(0, 10)}`,
        channel: 'PUSH',
        status: 'QUEUED',
        recipientPhone: teacher.phone,
      },
    })

    created += 1
  }

  return successResponse({ checked: expiring.length, created })
}

