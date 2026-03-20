import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { sendNotification } from '@/modules/notifications/actions'
import { sendNotificationSchema } from '@/modules/notifications/validations'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: POST /api/notifications/send ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    await requireAuth()
    const body = await req.json()
    const validated = sendNotificationSchema.parse(body)
    const result = await sendNotification(validated)
    return successResponse(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'فشل إرسال الإشعار'
    return errorResponse('SEND_FAILED', message, 500)
  }
}
