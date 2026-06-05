import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { markAttendance } from '@/modules/attendance/actions'
import { successResponse, errorResponse, forbidden, unauthorized } from '@/lib/api-response'

// ── API: POST /api/sessions/[sessionId]/attendance ───────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireTenant()
    const user = await requireAuth(req)
    if (!checkRole(user.role, STAFF_ROLES)) return forbidden()
    const { sessionId } = await params
    const body = await req.json()
    const result = await markAttendance(sessionId, body.records)
    return successResponse(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized()
    const message =
      error instanceof Error ? error.message : 'فشل تسجيل الحضور'
    return errorResponse('MARK_FAILED', message, 500)
  }
}
