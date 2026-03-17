import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getOverdueStudents } from '@/modules/payments/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/payments/overdue ───────────────────────────────────────────

export async function GET() {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const overdueStudents = await getOverdueStudents(tenant.id)
    return successResponse(overdueStudents)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل المتأخرين', 500)
  }
}
