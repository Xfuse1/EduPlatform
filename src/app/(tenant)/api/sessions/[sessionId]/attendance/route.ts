import { type NextRequest } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { markAttendance } from '@/modules/attendance/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: POST /api/sessions/[sessionId]/attendance ───────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireTenant()
    await requireAuth()
    const { sessionId } = await params
    const body = await req.json()
    const result = await markAttendance(sessionId, body.records)
    return successResponse(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'فشل تسجيل الحضور'
    return errorResponse('MARK_FAILED', message, 500)
  }
}
