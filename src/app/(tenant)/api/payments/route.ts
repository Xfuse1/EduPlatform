import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getPayments } from '@/modules/payments/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/payments ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const payments = await getPayments(tenant.id, {
      studentId: searchParams.get('studentId') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return successResponse(payments)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل المدفوعات', 500)
  }
}
