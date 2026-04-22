import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { initiateTeacherSubscriptionCheckout } from '@/modules/payments/actions'

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()

    const result = await initiateTeacherSubscriptionCheckout({
      subscriptionPlan: body.subscriptionPlan,
      billingCycle: body.billingCycle,
    })

    return successResponse(result)
  } catch (error) {
    return errorResponse('SUBSCRIPTION_CHECKOUT_FAILED', error instanceof Error ? error.message : 'Failed to initiate subscription checkout', 400)
  }
}

