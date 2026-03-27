import { type NextRequest, NextResponse } from 'next/server'
import { getPaymentByKashierOrderId } from '@/modules/payments/queries'

// ── API: GET /api/payments/kashier/callback ──────────────────────────────────
// Kashier يعمل redirect لهذا الـ URL بعد إتمام عملية الدفع
// ⚠️ لا تحدّث DB هنا — استخدم الـ webhook للتأكيد الموثوق
// الـ callback للـ UX فقط (إظهار رسالة نجاح/فشل للمستخدم)

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const orderId = searchParams.get('orderId') ?? ''
  // paymentStatus بيجي من Kashier في الـ redirect URL
  const paymentStatus = searchParams.get('paymentStatus') ?? ''

  // اقرأ حالة الدفع من DB — أدق من الـ query param لأن الـ webhook قد يكون وصل أولاً
  const payment = await getPaymentByKashierOrderId(orderId)

  // قرر النتيجة: الـ webhook هو المصدر الحقيقي — الـ query param احتياطي
  let result: 'success' | 'failed' | 'pending'
  if (payment?.status === 'PAID' || paymentStatus === 'SUCCESS') {
    result = 'success'
  } else if (payment?.status === 'OVERDUE' || paymentStatus === 'FAILED') {
    result = 'failed'
  } else {
    result = 'pending'
  }

  // بناء redirect URL — نستخدم origin للحفاظ على الـ subdomain (academy.localhost)
  const redirectUrl = new URL('/payments', origin)
  redirectUrl.searchParams.set('kashier', result)

  return NextResponse.redirect(redirectUrl)
}
