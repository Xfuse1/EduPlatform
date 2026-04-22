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

  // وجهة UX تعتمد على نوع الطلب وليس صفحة ثابتة:
  // SUBK-* => الاشتراكات
  // RCH-*  => المحفظة
  // غير ذلك => صفحة المدفوعات
  let destinationPath = '/payments'
  const notes = payment?.notes ?? ''
  if (orderId.startsWith('SUBK-') || notes.startsWith('SUBSCRIPTION:')) {
    destinationPath = '/payments/subscription'
  } else if (orderId.startsWith('RCH-') || notes.startsWith('RECHARGE:')) {
    destinationPath = '/payments/wallet'
  }

  // بناء redirect URL — نحافظ على الـ subdomain الحالي
  const redirectUrl = new URL(destinationPath, origin)
  redirectUrl.searchParams.set('kashier', result)
  redirectUrl.searchParams.set('orderId', orderId)

  return NextResponse.redirect(redirectUrl)
}
