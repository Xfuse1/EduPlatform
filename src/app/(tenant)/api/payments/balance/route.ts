import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { debitStudentBalance } from '@/modules/payments/actions'
import { getStudentBalance } from '@/modules/payments/providers/balance'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId') ?? user.id

    const data = await getStudentBalance(studentId, tenant.id)

    return successResponse({
      owner: data.owner,
      ownerId: data.ownerId,
      balance: data.balance?.balance ?? 0,
      updatedAt: data.balance?.updatedAt ?? null,
    })
  } catch (error) {
    return errorResponse('BALANCE_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch balance', 400)
  }
}

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

