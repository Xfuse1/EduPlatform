import { requireTenant } from '@/lib/tenant'
import { getTodaySessions } from '@/modules/attendance/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/sessions/today ─────────────────────────────────────────────

export async function GET() {
  try {
    const tenant = await requireTenant()
    const sessions = await getTodaySessions(tenant.id)
    return successResponse(sessions)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل الحصص', 500)
  }
}
