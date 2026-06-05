import { type NextRequest } from 'next/server'

import { UserRole } from '@/generated/client'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { errorResponse, forbidden, notFound, successResponse } from '@/lib/api-response'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { requireTenant } from '@/lib/tenant'
import { generateReceipt } from '@/modules/payments/actions'

// ── API: GET /api/payments/[paymentId]/receipt ───────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(req)
    const { paymentId } = await params

    // Staff may read any receipt in the tenant. STUDENT/PARENT may only read a
    // receipt for a payment that belongs to themselves / their linked child.
    if (!checkRole(user.role, STAFF_ROLES)) {
      const payment = await db.payment.findFirst({
        where: { id: paymentId, tenantId: tenant.id },
        select: { studentId: true },
      })

      if (!payment) return notFound('الإيصال غير موجود')

      let allowed = payment.studentId === user.id
      if (!allowed && user.role === UserRole.PARENT) {
        const link = await db.parentStudent.findFirst({
          where: { parentId: user.id, studentId: payment.studentId },
          select: { id: true },
        })
        allowed = Boolean(link)
      }

      if (!allowed) return forbidden()
    }

    const result = await generateReceipt(paymentId)
    return successResponse(result.data)
  } catch (error) {
    console.error('Receipt fetch failed:', error)
    return errorResponse('FETCH_FAILED', 'فشل تحميل الإيصال', 500)
  }
}
