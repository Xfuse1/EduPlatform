import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getTodaySessions } from '@/modules/attendance/queries'

export async function GET() {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const sessions = await getTodaySessions(tenant.id, teacherScopeUserId ?? undefined)

    return successResponse(sessions)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل الحصص', 500)
  }
}
