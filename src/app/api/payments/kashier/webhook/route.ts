import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { kashierWebhookSchema, verifyKashierWebhookSignature } from '@/modules/payments/validations'
import { verifyKashierWebhookSignature as verifySignature } from '@/modules/payments/providers/kashier'

// ── Kashier Webhook Handler ────────────────────────────────────────────────

/**
 * POST /api/payments/kashier/webhook
 *
 * الـ endpoint الذي يستقبل تأكيد الدفع من Kashier
 * - التحقق من التوقيع (security)
 * - تحديث حالة الدفع في DB
 * - إنشاء transaction للرصيد إذا لزم الأمر
 * - إرسال إشعار للمستخدم
 */
export async function POST(request: NextRequest) {
  try {
    // الحصول على الـ signature من الـ header
    const signature = request.headers.get('x-kashier-signature')
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 },
      )
    }

    // قراءة الـ body
    const rawBody = await request.text()

    // التحقق من التوقيع
    const isValid = verifySignature(rawBody, signature)
    if (!isValid) {
      console.error('Invalid Kashier webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      )
    }

    // parse الـ JSON
    const payload = JSON.parse(rawBody)

    // validate الـ schema
    const validatedData = kashierWebhookSchema.parse(payload)

    // جيب الـ order من DB
    const payment = await db.payment.findFirst({
      where: { receiptNumber: validatedData.orderId },
      include: {
        student: { select: { id: true, name: true } },
        tenant: { select: { id: true, slug: true } },
      },
    })

    if (!payment) {
      console.warn(`Payment not found for orderId: ${validatedData.orderId}`)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 },
      )
    }

    // handle الـ status
    switch (validatedData.status) {
      case 'SUCCESS':
        await handleSuccessfulPayment(payment, validatedData)
        break

      case 'FAILED':
        await handleFailedPayment(payment)
        break

      case 'VOIDED':
        await handleVoidedPayment(payment)
        break

      default:
        console.warn(`Unknown payment status: ${validatedData.status}`)
    }

    // return success لـ Kashier
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Kashier webhook error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}

/**
 * معالجة دفعة ناجحة
 */
async function handleSuccessfulPayment(payment: any, webhookData: any) {
  // تحديث حالة الدفع
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      transactionId: webhookData.transactionId,
    },
  })

  // TODO: إضافة رصيد للطالب إذا كان الدفع لإضافة رصيد
  // (هذا يعتمد على نوع الدفع — رسوم الحصة أم إضافة رصيد)

  // TODO: إرسال إشعار SMS/WhatsApp للوالد بنجاح الدفع

  console.log(`Payment ${payment.id} marked as PAID`)
}

/**
 * معالجة دفعة فاشلة
 */
async function handleFailedPayment(payment: any) {
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PENDING', // ابقه معلق حتى يحاول المستخدم مرة أخرى
    },
  })

  // TODO: إرسال إشعار بفشل الدفع

  console.log(`Payment ${payment.id} failed`)
}

/**
 * معالجة دفعة ملغاة
 */
async function handleVoidedPayment(payment: any) {
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PENDING', // إرجاعه للانتظار حتى يدفع مرة أخرى
    },
  })

  // TODO: إرسال إشعار بإلغاء الدفع

  console.log(`Payment ${payment.id} voided`)
}
