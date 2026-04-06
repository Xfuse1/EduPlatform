import type { NextRequest } from 'next/server'
import { PaymentStatus } from '@prisma/client'
import { ZodError } from 'zod'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse, validationError } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { createStudent } from '@/modules/students/actions'
import { getStudents } from '@/modules/students/queries'

async function requestToFormData(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    return request.formData()
  }

  const payload = (await request.json()) as Record<string, unknown>
  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        formData.append(key, String(entry))
      }
      continue
    }

    if (value !== undefined && value !== null) {
      formData.set(key, String(value))
    }
  }

  return formData
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(request)

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const search = request.nextUrl.searchParams.get('search') ?? undefined
    const groupId = request.nextUrl.searchParams.get('groupId') ?? undefined
    const paymentStatusValue = request.nextUrl.searchParams.get('paymentStatus') ?? undefined
    const paymentStatus =
      paymentStatusValue && Object.values(PaymentStatus).includes(paymentStatusValue as PaymentStatus)
        ? (paymentStatusValue as PaymentStatus)
        : undefined
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)

    const students = await getStudents(
      tenant.id,
      {
        search,
        groupId,
        paymentStatus,
      },
      teacherScopeUserId ?? undefined,
    )

    return successResponse(students, { total: students.length, page: 1 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'STUDENTS_FETCH_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب الطلاب',
      400,
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await requestToFormData(request)
    const result = await createStudent(formData)

    return successResponse(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'STUDENT_CREATE_FAILED',
      error instanceof Error ? error.message : 'تعذر إنشاء الطالب',
      400,
    )
  }
}
