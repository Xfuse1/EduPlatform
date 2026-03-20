import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { verifyKashierWebhookSignature } from '@/modules/payments/providers/kashier'
import { kashierWebhookSchema } from '@/modules/payments/validations'

// ── API: POST /api/payments/kashier/webhook ──────────────────────────────────
// ⚠️ هذا الـ route بدون requireAuth — لأنه webhook خارجي من Kashier
// الأمان يأتي من HMAC signature verification حصراً

export async function POST(req: NextRequest) {
  // اقرأ الـ raw body قبل أي parsing — ضروري للـ HMAC
  const rawBody = await req.text()

  // تحقق من HMAC signature — أمان حرج
  const signature = req.headers.get('x-kashier-signature') ?? ''
  if (!verifyKashierWebhookSignature(rawBody, signature)) {
    // سجّل محاولة توقيع فاشلة للمراقبة
    console.error('[Kashier Webhook] ❌ Invalid signature — possible forgery attempt')
    return errorResponse('INVALID_SIGNATURE', 'توقيع غير صحيح', 401)
  }

  // حلّل الـ JSON بعد التحقق من الـ signature
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return errorResponse('INVALID_JSON', 'payload غير صالح', 400)
  }

  // تحقق من شكل البيانات بـ Zod
  const parsed = kashierWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('INVALID_PAYLOAD', 'بيانات webhook غير مكتملة', 400)
  }

  const { orderId, transactionId, status } = parsed.data

  // جيب الـ payment من DB مباشرة — لا تستخدم cached query في webhook
  // لا تثق بـ tenantId من الـ request
  const payment = await db.payment.findUnique({
    where: { kashierOrderId: orderId },
  })
  if (!payment) {
    // قد يكون orderId غير موجود — نرجع 200 لمنع Kashier من إعادة الإرسال
    console.warn(`[Kashier Webhook] orderId غير موجود: ${orderId}`)
    return successResponse({ received: true })
  }

  // Idempotency: لو الدفعة مدفوعة بالفعل — تجاهل ولا تغيّر الحالة
  if (payment.status === 'PAID') {
    console.info(`[Kashier Webhook] ℹ️ orderId=${orderId} مدفوع بالفعل — تجاهل`)
    return successResponse({ received: true })
  }

  // حوّل Kashier status إلى PaymentStatus
  const newStatus = status === 'SUCCESS' ? 'PAID' : status === 'FAILED' ? 'OVERDUE' : 'PENDING'

  // حدّث الـ payment في DB
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      kashierTransactionId: transactionId ?? null,
      paidAt: status === 'SUCCESS' ? new Date() : null,
    },
  })

  // تحديث Next.js cache عشان صفحة المدفوعات تعرض البيانات الجديدة
  revalidatePath('/payments')

  console.info(
    `[Kashier Webhook] ✅ orderId=${orderId} → status=${newStatus} | transactionId=${transactionId}`,
  )

  return successResponse({ received: true })
}
