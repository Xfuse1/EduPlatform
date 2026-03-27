import { type NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getAttendanceReport } from '@/modules/attendance/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const report = await getAttendanceReport(tenant.id, month, teacherScopeUserId ?? undefined)

    return successResponse(report)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل تقرير الحضور', 500)
  }
}
