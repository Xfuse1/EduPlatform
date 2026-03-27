import { z } from 'zod'

// ── B-03: Payments Validations ───────────────────────────────────────────────

/**
 * Schema لتسجيل دفعة يدوية جديدة
 */
export const paymentRecordSchema = z.object({
  studentId: z.string().min(1, 'الطالب مطلوب'),
  amount: z
    .number()
    .int('المبلغ لازم يكون رقم صحيح')
    .positive('المبلغ لازم يكون موجب'),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'صيغة الشهر غير صحيحة — المطلوب: YYYY-MM'),
  method: z.enum(['CASH', 'VODAFONE_CASH', 'FAWRY', 'INSTAPAY', 'CARD']),
  notes: z.string().max(500, 'الملاحظات لا تتجاوز 500 حرف').optional(),
})

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>

/**
 * Schema لبدء دفع أونلاين عبر Kashier
 */
export const initiatePaymentSchema = z.object({
  studentId: z.string().min(1, 'الطالب مطلوب'),
  amount: z
    .number()
    .int('المبلغ لازم يكون رقم صحيح')
    .positive('المبلغ لازم يكون موجب'),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'صيغة الشهر غير صحيحة — المطلوب: YYYY-MM'),
  notes: z.string().max(500).optional(),
})

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>

/**
 * Schema لـ Kashier Webhook payload
 * يُستخدم في route.ts للـ webhook لتحقق من شكل البيانات القادمة
 */
export const kashierWebhookSchema = z.object({
  orderId: z.string().min(1),
  transactionId: z.string().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'PENDING', 'VOIDED']),
  amount: z.string().optional(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),
  // Kashier قد يرسل fields إضافية — نتجاهلها
})

export type KashierWebhookPayload = z.infer<typeof kashierWebhookSchema>
