import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/config/env'

// ── Kashier Payment Gateway Provider ────────────────────────────────────────
// https://kashier.io — Egyptian Payment Gateway
// Hash: HMAC-SHA256("?mid={mid}&amount={amount}&currency={currency}&orderId={orderId}", apiKey)

const KASHIER_CHECKOUT_URL = 'https://checkout.kashier.io/'

export interface KashierOrderParams {
  orderId: string       // مثال: KSH-academy-20260317-0001
  amount: number        // بالجنيه المصري (رقم صحيح)
  studentName: string
  callbackUrl: string   // URL بعد الدفع (redirect للمستخدم)
  webhookUrl: string    // URL لاستقبال إشعار الخادم
}

/**
 * يولّد رابط Kashier Checkout الكامل مع HMAC Hash
 * ⚠️ كل الـ params معرّضة على URL — لا تضع بيانات حساسة هنا
 */
export function createKashierCheckoutUrl(params: KashierOrderParams): string {
  const merchantId = env.KASHIER_MERCHANT_ID
  const apiKey = env.KASHIER_API_KEY

  if (!merchantId || !apiKey) {
    throw new Error(
      'Kashier غير مُعد — أضف KASHIER_MERCHANT_ID و KASHIER_API_KEY في ملف .env',
    )
  }

  // المبلغ بصيغة decimal (جنيه.قرش) — Kashier يتوقع "400.00" مش "400"
  const amountStr = params.amount.toFixed(2)
  const currency = 'EGP'

  // Hash message حسب توثيق Kashier
  const message = `?mid=${merchantId}&amount=${amountStr}&currency=${currency}&orderId=${params.orderId}`
  const hash = createHmac('sha256', apiKey).update(message).digest('hex')

  const url = new URL(KASHIER_CHECKOUT_URL)
  url.searchParams.set('merchantId', merchantId)
  url.searchParams.set('orderId', params.orderId)
  url.searchParams.set('amount', amountStr)
  url.searchParams.set('currency', currency)
  url.searchParams.set('hash', hash)
  url.searchParams.set('redirectUrl', params.callbackUrl)
  url.searchParams.set('webhookUrl', params.webhookUrl)
  url.searchParams.set('allowedMethods', 'card,bank_installments,mobile_wallet,service_bill')
  url.searchParams.set('display', params.studentName)
  url.searchParams.set(
    'mode',
    process.env.NODE_ENV === 'production' ? 'live' : 'test',
  )

  return url.toString()
}

/**
 * التحقق من توقيع webhook — أمان حرج
 * يستخدم timingSafeEqual لمنع Timing Attacks
 * ⚠️ لو الـ secret مش موجود = webhook مرفوض
 */
export function verifyKashierWebhookSignature(
  rawBody: string,
  receivedSignature: string,
): boolean {
  const secret = env.KASHIER_WEBHOOK_SECRET
  if (!secret || !receivedSignature) return false

  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // تحويل لـ Buffer لاستخدام timingSafeEqual
  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  const receivedBuf = Buffer.from(receivedSignature, 'hex')

  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
