import { z } from 'zod'

// ── B-03: Payments Validations ───────────────────────────────────────────────

/**
 * Schema لتسجيل دفعة جديدة
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
