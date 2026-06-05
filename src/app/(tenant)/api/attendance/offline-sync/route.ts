import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { syncOfflineRecords } from '@/modules/attendance/actions'
import { successResponse, errorResponse, forbidden, unauthorized } from '@/lib/api-response'

// ── API: POST /api/attendance/offline-sync ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    const user = await requireAuth(req)
    if (!checkRole(user.role, STAFF_ROLES)) return forbidden()
    const body = await req.json()
    const result = await syncOfflineRecords(body.records)
    return successResponse(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized()
    const message = error instanceof Error ? error.message : 'فشل المزامنة'
    return errorResponse('SYNC_FAILED', message, 500)
  }
}
