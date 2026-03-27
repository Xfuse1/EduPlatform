import { z } from 'zod'

// ── B-05: Notifications Validations ────────────────────────────────────────────────

/**
 * Schema لإرسال إشعار واحد — يستخدم في API route /api/notifications/send
 */
export const sendNotificationSchema = z.object({
  userId: z.string().min(1, 'userId مطلوب'),
  type: z.enum([
    'ATTENDANCE_PRESENT',
    'ATTENDANCE_ABSENT',
    'PAYMENT_REMINDER',
    'PAYMENT_OVERDUE',
    'CLASS_REMINDER',
  ]),
  channel: z.enum(['SMS', 'WHATSAPP']),
  recipientPhone: z.string().min(11, 'رقم الهاتف غير صحيح — لازم 11 رقم على الأقل'),
  templateData: z.record(z.string(), z.union([z.string(), z.number()])),
})

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>
