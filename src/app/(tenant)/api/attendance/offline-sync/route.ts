import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { syncOfflineRecords } from '@/modules/attendance/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

// ── API: POST /api/attendance/offline-sync ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    await requireAuth()
    const body = await req.json()
    const result = await syncOfflineRecords(body.records)
    return successResponse(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل المزامنة'
    return errorResponse('SYNC_FAILED', message, 500)
  }
}
