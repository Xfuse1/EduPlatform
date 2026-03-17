import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { sendPaymentReminder } from '@/modules/payments/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: POST /api/payments/remind ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    await requireAuth()
    const body = await req.json()
    const result = await sendPaymentReminder(body.studentIds)
    return successResponse(result)
  } catch {
    return errorResponse('SEND_FAILED', 'فشل إرسال التذكيرات', 500)
  }
}
