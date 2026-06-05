import { NextRequest } from 'next/server'

import { env } from '@/config/env'
import { db } from '@/lib/db'
import { errorResponse, successResponse } from '@/lib/api-response'
import { resolveTenantPayeeUserId } from '@/modules/wallet/provider'

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
  let skipped = 0

  for (const subscription of expiring) {
    // Resolve the recipient consistently with the financial owner of the tenant
    // (CENTER_ADMIN first, then TEACHER/ADMIN/MANAGER) rather than an arbitrary TEACHER.
    let recipientId: string
    try {
      recipientId = await resolveTenantPayeeUserId(subscription.tenantId)
    } catch {
      // No active owner account found for this tenant — nothing to notify.
      skipped += 1
      continue
    }

    const recipient = await db.user.findFirst({
      where: { id: recipientId, tenantId: subscription.tenantId },
      select: { id: true, phone: true },
    })

    if (!recipient) {
      skipped += 1
      continue
    }

    const billingDate = subscription.nextBillingAt.toISOString().slice(0, 10)

    // Idempotency: skip if a reminder for this exact billing date already exists
    // for this recipient, so re-running the job does not create duplicates.
    const existing = await db.notification.findFirst({
      where: {
        tenantId: subscription.tenantId,
        userId: recipient.id,
        type: 'PAYMENT_REMINDER',
        message: { contains: billingDate },
      },
      select: { id: true },
    })

    if (existing) {
      skipped += 1
      continue
    }

    await db.notification.create({
      data: {
        tenantId: subscription.tenantId,
        userId: recipient.id,
        type: 'PAYMENT_REMINDER',
        message: `Subscription renewal is due on ${billingDate}`,
        channel: 'PUSH',
        status: 'QUEUED',
        recipientPhone: recipient.phone,
      },
    })

    created += 1
  }

  return successResponse({ checked: expiring.length, created, skipped })
}

