import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Kashier Callback Handler ───────────────────────────────────────────────

/**
 * GET /api/payments/kashier/callback?orderId={orderId}
 *
 * الـ endpoint الذي يُعيد المستخدم إليه بعد انتهاء الدفع على Kashier
 * - يتحقق من حالة الدفع في DB
 * - يعيد توجيه المستخدم إلى صفحة النتيجة
 *
 * ⚠️ هذا ليس الـ confirmation الحقيقي — الـ webhook هو المسؤول
 */
export async function GET(request: NextRequest) {
  try {
    // جيب الـ orderId من query string
    const orderId = request.nextUrl.searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.redirect(
        new URL('/payments/error?reason=invalid_order', request.url),
      )
    }

    // جيب الـ payment من DB
    const payment = await db.payment.findFirst({
      where: { receiptNumber: orderId },
      select: {
        id: true,
        status: true,
        studentId: true,
        amount: true,
      },
    })

    if (!payment) {
      return NextResponse.redirect(
        new URL('/payments/error?reason=not_found', request.url),
      )
    }

    // redirect بناءً على الحالة
    if (payment.status === 'PAID') {
      return NextResponse.redirect(
        new URL(`/payments/success?orderId=${orderId}`, request.url),
      )
    } else if (payment.status === 'PENDING') {
      // الدفع لم يُؤكد بعد — ممكن جاري المعالجة
      return NextResponse.redirect(
        new URL(`/payments/processing?orderId=${orderId}`, request.url),
      )
    } else {
      return NextResponse.redirect(
        new URL('/payments/error?reason=payment_failed', request.url),
      )
    }
  } catch (error) {
    console.error('Kashier callback error:', error)
    return NextResponse.redirect(
      new URL('/payments/error?reason=server_error', request.url),
    )
  }
}
