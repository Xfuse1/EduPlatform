import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getNotificationLogs } from '@/modules/notifications/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: GET /api/notifications/logs ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const logs = await getNotificationLogs(tenant.id, {
      type: searchParams.get('type') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return successResponse(logs)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل سجل الإشعارات', 500)
  }
}
