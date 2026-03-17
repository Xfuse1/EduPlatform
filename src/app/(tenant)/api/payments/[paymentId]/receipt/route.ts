import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { generateReceipt } from '@/modules/payments/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/payments/[paymentId]/receipt ───────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    await requireTenant()
    await requireAuth()
    const { paymentId } = await params
    const result = await generateReceipt(paymentId)
    return successResponse(result.data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'فشل تحميل الإيصال'
    return errorResponse('FETCH_FAILED', message, 500)
  }
}
