import { type NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/generated/client'
import { getPaymentByKashierOrderId } from '@/modules/payments/queries'

// ── API: GET /api/payments/kashier/callback ──────────────────────────────────
// Kashier يعمل redirect لهذا الـ URL بعد إتمام عملية الدفع
// ⚠️ لا تحدّث DB هنا — استخدم الـ webhook للتأكيد الموثوق
// الـ callback للـ UX فقط (إظهار رسالة نجاح/فشل للمستخدم)

const ALLOWED_RETURN_PATHS = new Set([
  '/parent',
  '/student',
  '/center',
  '/teacher',
  '/payments',
  '/payments/subscription',
])

function getPaymentReturnPath(role?: UserRole | null) {
  switch (role) {
    case 'PARENT':
      return '/parent'
    case 'STUDENT':
      return '/student'
    case 'CENTER_ADMIN':
    case 'ADMIN':
    case 'MANAGER':
      return '/center'
    case 'TEACHER':
    case 'ASSISTANT':
      return '/teacher'
    default:
      return null
  }
}

function sanitizeReturnPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return ALLOWED_RETURN_PATHS.has(value) ? value : null
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const orderId = searchParams.get('orderId') ?? ''
  const returnTo = sanitizeReturnPath(searchParams.get('returnTo'))
  // paymentStatus بيجي من Kashier في الـ redirect URL
  const paymentStatus = (searchParams.get('paymentStatus') ?? '').toUpperCase()

  // اقرأ حالة الدفع من DB — أدق من الـ query param لأن الـ webhook قد يكون وصل أولاً
  const payment = await getPaymentByKashierOrderId(orderId)

  // قرر النتيجة: الـ webhook هو المصدر الحقيقي — الـ query param احتياطي
  let result: 'success' | 'failed' | 'pending'
  if (payment?.status === 'PAID' || paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
    result = 'success'
  } else if (payment?.status === 'OVERDUE' || paymentStatus === 'FAILED' || paymentStatus === 'FAIL') {
    result = 'failed'
  } else {
    result = 'pending'
  }

  // وجهة UX تعتمد على دور المستخدم الذي بدأ العملية، حتى لا يعود الطالب/ولي الأمر
  // إلى صفحة مالية المعلم عند إلغاء دفع Kashier من واجهة الدفع.
  let destinationPath = returnTo ?? getPaymentReturnPath(payment?.recordedBy?.role) ?? '/payments'
  const notes = payment?.notes ?? ''

  if (!returnTo && (orderId.startsWith('SUBK-') || notes.startsWith('SUBSCRIPTION:'))) {
    destinationPath = '/payments/subscription'
  }

  // بناء redirect URL — نحافظ على الـ subdomain الحالي
  const redirectUrl = new URL(destinationPath, origin)
  redirectUrl.searchParams.set('kashier', result)
  redirectUrl.searchParams.set('orderId', orderId)

  return NextResponse.redirect(redirectUrl)
}
