import { errorResponse } from '@/lib/api-response'

export async function GET() {
  return errorResponse('NOT_READY', 'هذا المسار سيُستكمل مع موديول الحصص', 503)
}
