import { errorResponse } from '@/lib/api-response'

export async function POST() {
  return errorResponse('NOT_READY', 'هذا المسار سيُستكمل مع موديول الحضور', 503)
}
