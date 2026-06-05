import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { debitStudentBalance } from '@/modules/payments/actions'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    // Staff-only: this endpoint triggers a wallet debit against a student balance.
    if (!checkRole(user.role, STAFF_ROLES)) return forbidden()
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
