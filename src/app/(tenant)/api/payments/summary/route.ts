import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/payments/summary ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? undefined
    const summary = await getRevenueSummary(tenant.id, month)
    return successResponse(summary)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل ملخص الإيرادات', 500)
  }
}
