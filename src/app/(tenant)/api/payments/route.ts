import { type NextRequest } from 'next/server'
import { UserRole } from '@/generated/client'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { getPayments } from '@/modules/payments/queries'
import { successResponse, errorResponse, forbidden } from '@/lib/api-response'

// ── API: GET /api/payments ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const requestedStudentId = searchParams.get('studentId') ?? undefined
    const month = searchParams.get('month') ?? undefined
    const status = searchParams.get('status') ?? undefined

    let studentId = requestedStudentId
    let teacherScopeUserId: string | undefined

    if (user.role === UserRole.STUDENT) {
      // Students may only ever see their own payments.
      if (requestedStudentId && requestedStudentId !== user.id) return forbidden()
      studentId = user.id
    } else if (user.role === UserRole.PARENT) {
      // Parents may see their own payments or those of a linked child only.
      if (requestedStudentId && requestedStudentId !== user.id) {
        const linkedChild = await db.parentStudent.findFirst({
          where: { parentId: user.id, studentId: requestedStudentId },
          select: { id: true },
        })
        if (!linkedChild) return forbidden()
        studentId = requestedStudentId
      } else {
        studentId = user.id
      }
    } else if (user.role === UserRole.TEACHER) {
      // Teachers are restricted to students in their own groups.
      teacherScopeUserId = getTeacherScopeUserId(tenant, user) ?? undefined
    } else if (
      user.role !== UserRole.CENTER_ADMIN &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.ASSISTANT
    ) {
      // Any other role (e.g. SUPER_ADMIN acting outside a center) is not allowed
      // to list this center's payments.
      return forbidden()
    }

    const payments = await getPayments(
      tenant.id,
      { studentId, month, status },
      teacherScopeUserId,
    )
    return successResponse(payments)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل المدفوعات', 500)
  }
}
