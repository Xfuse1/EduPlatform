import { NextResponse } from 'next/server'

import type { ApiError, ApiMeta, ApiResponse } from '@/types'

export function successResponse<T>(data: T, meta?: ApiMeta) {
  const body: ApiResponse<T> = meta ? { data, meta } : { data }

  return NextResponse.json(body)
}

export function errorResponse<TDetails = unknown>(
  code: string,
  message: string,
  status: number,
  details?: TDetails,
) {
  const body: ApiError<TDetails> = details
    ? { error: { code, message, details } }
    : { error: { code, message } }

  return NextResponse.json(body, { status })
}

export function notFound(message = 'غير موجود') {
  return errorResponse('NOT_FOUND', message, 404)
}

export function unauthorized() {
  return errorResponse('UNAUTHORIZED', 'يرجى تسجيل الدخول', 401)
}

export function forbidden() {
  return errorResponse('FORBIDDEN', 'ليس لديك صلاحية', 403)
}

export function validationError<TDetails = unknown>(details?: TDetails) {
  return errorResponse('VALIDATION_ERROR', 'بيانات غير صحيحة', 422, details)
}
