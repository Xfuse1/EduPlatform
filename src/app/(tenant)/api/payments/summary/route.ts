import { type NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? undefined
    const summary = await getRevenueSummary(tenant.id, month, teacherScopeUserId ?? undefined)

    return successResponse(summary)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل ملخص الإيرادات', 500)
  }
}
