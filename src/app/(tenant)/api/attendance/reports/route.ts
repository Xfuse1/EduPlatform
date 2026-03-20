import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getAttendanceReport } from '@/modules/attendance/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/attendance/reports ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const month =
      searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const report = await getAttendanceReport(tenant.id, month)
    return successResponse(report)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل تقرير الحضور', 500)
  }
}
