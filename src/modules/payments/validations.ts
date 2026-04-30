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
  hash: z.string().optional(),
})

export type KashierWebhookPayload = z.infer<typeof kashierWebhookSchema>

// ── Balance Validations (جديد) ────────────────────────────────────────────────

/**
 * Schema لإضافة رصيد جديد عبر Kashier
 */
export const rechargeBalanceSchema = z.object({
  amount: z
    .number()
    .int('المبلغ لازم يكون رقم صحيح')
    .positive('المبلغ لازم يكون موجب')
    .max(1000000, 'المبلغ الأقصى 10 مليون جنيه'),
  description: z.string().max(200).optional(),
})

export type RechargeBalanceInput = z.infer<typeof rechargeBalanceSchema>

/**
 * Schema لخصم من رصيد الطالب/ولي الأمر (داخلي)
 */
export const debitBalanceSchema = z.object({
  studentId: z.string().min(1, 'الطالب مطلوب'),
  amount: z
    .number()
    .int('المبلغ لازم يكون رقم صحيح')
    .positive('المبلغ لازم يكون موجب'),
  reason: z.string().min(1, 'السبب مطلوب').max(200),
  relatedPaymentId: z.string().optional(),
})

export type DebitBalanceInput = z.infer<typeof debitBalanceSchema>

/**
 * Schema لإضافة Kashier API للمعلم
 */
export const addKashierApiSchema = z.object({
  kashierApiKey: z.string().min(10, 'مفتاح API غير صحيح').max(500),
  kashierMerId: z.string().min(1, 'معرف التاجر مطلوب').max(100),
})

export type AddKashierApiInput = z.infer<typeof addKashierApiSchema>

/**
 * Schema لتحديث خطة الاشتراك للمعلم
 */
export const updateSubscriptionSchema = z.object({
  subscriptionPlan: z.string().trim().min(1, 'الباقة مطلوبة').max(40, 'مفتاح الباقة طويل جدًا'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
})

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>
