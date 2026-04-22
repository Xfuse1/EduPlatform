import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { debitStudentBalance } from '@/modules/payments/actions'

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()

    const result = await debitStudentBalance({
      studentId: String(body.studentId),
      amount: Number(body.amount),
      month: String(body.month),
      reason: String(body.reason ?? 'Session fee'),
    })

    if (!result.success) {
      return errorResponse('BALANCE_DEBIT_FAILED', result.message ?? 'Failed to debit balance', 400)
    }

    return successResponse(result)
  } catch (error) {
    return errorResponse('BALANCE_DEBIT_FAILED', error instanceof Error ? error.message : 'Failed to debit balance', 400)
  }
}

