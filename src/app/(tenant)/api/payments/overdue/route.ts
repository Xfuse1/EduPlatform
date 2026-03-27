import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getOverdueStudents } from '@/modules/payments/queries'

export async function GET() {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const overdueStudents = await getOverdueStudents(tenant.id, teacherScopeUserId ?? undefined)

    return successResponse(overdueStudents)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل المتأخرين', 500)
  }
}
