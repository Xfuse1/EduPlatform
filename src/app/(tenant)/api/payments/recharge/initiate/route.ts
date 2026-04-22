import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { initiateBalanceRecharge } from '@/modules/payments/actions'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()

    const targetStudentId = typeof body.studentId === 'string' && body.studentId.length > 0 ? body.studentId : user.id
    const amount = Number(body.amount)
    const description = typeof body.description === 'string' ? body.description : undefined

    const result = await initiateBalanceRecharge({
      studentId: targetStudentId,
      amount,
      description,
    })

    return successResponse(result)
  } catch (error) {
    return errorResponse('RECHARGE_INIT_FAILED', error instanceof Error ? error.message : 'Failed to initiate recharge', 400)
  }
}

