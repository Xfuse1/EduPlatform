import { NextRequest } from 'next/server'

import { EnrollmentStatus, UserRole } from '@/generated/client'
import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { debitStudentBalance } from '@/modules/payments/actions'
import { getStudentBalance } from '@/modules/payments/providers/balance'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId') ?? user.id
    let walletTenantId = tenant.id

    if (user.role === UserRole.PARENT && studentId !== user.id) {
      const linkedChild = await db.parentStudent.findFirst({
        where: {
          parentId: user.id,
          studentId,
        },
        select: {
          student: {
            select: {
              tenantId: true,
              groupStudents: {
                where: {
                  status: {
                    in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST, EnrollmentStatus.PENDING],
                  },
                },
                select: {
                  group: {
                    select: {
                      tenantId: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
      })

      if (!linkedChild) throw new Error('الابن غير مرتبط بحساب ولي الأمر')
      walletTenantId = linkedChild.student.groupStudents[0]?.group.tenantId ?? linkedChild.student.tenantId
    }

    const data = await getStudentBalance(studentId, walletTenantId)

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

