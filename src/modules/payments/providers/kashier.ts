import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/config/env'

// ── Kashier Payment Gateway Provider ────────────────────────────────────────
// https://kashier.io — Egyptian Payment Gateway
// Hash: HMAC-SHA256("/?payment={mid}.{orderId}.{amount}.{currency}", apiKey)

const KASHIER_CHECKOUT_URL = 'https://checkout.kashier.io/'
const ALLOWED_METHODS = new Set(['card', 'wallet'])
const DEFAULT_METHODS = 'card,wallet'

// حسب env var أو الافتراضي — يُحسب مرة واحدة عند تحميل الموديول
const CONFIGURED_METHODS = (process.env.KASHIER_ALLOWED_METHODS ?? DEFAULT_METHODS)
  .split(',')
  .map((m) => m.trim())
  .filter((m) => ALLOWED_METHODS.has(m))
  .join(',') || DEFAULT_METHODS

export interface KashierOrderParams {
  orderId: string       // مثال: KSH-academy-20260317-0001
  amount: number        // بالجنيه المصري (رقم صحيح)
  studentName?: string
  customerPhone?: string
  customerEmail?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
  callbackUrl: string   // URL بعد الدفع (redirect للمستخدم)
  webhookUrl: string    // URL لاستقبال إشعار الخادم
}

function normalizeEgyptPhone(phone?: string): string | undefined {
  if (!phone) return undefined

  const normalized = phone.replace(/\s+/g, '')

  if (/^\+20\d{10}$/.test(normalized)) return normalized
  if (/^20\d{10}$/.test(normalized)) return `+${normalized}`
  if (/^01\d{9}$/.test(normalized)) return `+2${normalized}`

  return undefined
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

  // Hash message حسب الـ demo الرسمي من Kashier:
  // /?payment={mid}.{orderId}.{amount}.{currency}
  const message = `/?payment=${merchantId}.${params.orderId}.${amountStr}.${currency}`
  const hash = createHmac('sha256', apiKey).update(message).digest('hex')

  const url = new URL(KASHIER_CHECKOUT_URL)
  const mode = env.KASHIER_MODE ?? 'test'
  const normalizedPhone = normalizeEgyptPhone(params.customerPhone)
  const mergedMetadata = {
    source: 'eduplatform',
    studentName: params.studentName,
    customerPhone: normalizedPhone,
    customerEmail: params.customerEmail,
    ...params.metadata,
  }
  const cleanMetadata = Object.fromEntries(
    Object.entries(mergedMetadata).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )

  url.searchParams.set('merchantId', merchantId)
  url.searchParams.set('orderId', params.orderId)
  url.searchParams.set('amount', amountStr)
  url.searchParams.set('currency', currency)
  url.searchParams.set('hash', hash)
  // merchantRedirect هو الاسم المستخدم في أمثلة Kashier Hosted Checkout
  url.searchParams.set('merchantRedirect', params.callbackUrl)
  // نبقي redirectUrl للتوافق مع أي صيغة قديمة
  url.searchParams.set('redirectUrl', params.callbackUrl)
  url.searchParams.set('webhookUrl', params.webhookUrl)
  if (Object.keys(cleanMetadata).length > 0) {
    url.searchParams.set('metaData', JSON.stringify(cleanMetadata))
  }
  url.searchParams.set('allowedMethods', CONFIGURED_METHODS)
  url.searchParams.set('failureRedirect', 'true')
  url.searchParams.set('redirectMethod', 'get')
  // display ليست اسم العميل؛ هي إعداد عرض/لغة
  url.searchParams.set('display', 'en')
  url.searchParams.set('mode', mode)

  return url.toString()
}

// timingSafeEqual يمنع Timing Attacks عند مقارنة الـ hash
export function verifyKashierWebhookSignature(
  orderId: string,
  amount: string,
  currency: string,
  receivedHash: string,
): boolean {
  const apiKey = env.KASHIER_API_KEY
  const merchantId = env.KASHIER_MERCHANT_ID
  if (!apiKey || !merchantId || !receivedHash) return false

  const message = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`
  const expectedHash = createHmac('sha256', apiKey).update(message).digest('hex')

  const expectedBuf = Buffer.from(expectedHash, 'hex')
  const receivedBuf = Buffer.from(receivedHash, 'hex')

  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
