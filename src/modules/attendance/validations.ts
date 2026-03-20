import { z } from 'zod'

// ── B-01: Attendance Validations ────────────────────────────────────────────

/**
 * Schema للـ bulk attendance — يتحقق من sessionId + مصفوفة السجلات
 */
export const attendanceBulkSchema = z.object({
  sessionId: z.string().min(1, 'sessionId مطلوب'),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1, 'studentId مطلوب'),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      }),
    )
    .min(1, 'لازم يكون فيه سجلات على الأقل'),
})

/**
 * Schema للحصة اليدوية (تعويضية أو إضافية)
 */
export const manualSessionSchema = z.object({
  groupId: z.string().min(1, 'المجموعة مطلوبة'),
  date: z.coerce.date(),
  type: z.enum(['MAKEUP', 'EXTRA']),
})

/**
 * Schema لمزامنة سجلات الـ offline — مصفوفة كاملة
 */
export const offlineSyncSchema = z.array(
  z.object({
    sessionId: z.string().min(1, 'sessionId مطلوب'),
    studentId: z.string().min(1, 'studentId مطلوب'),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    markedAt: z.string().datetime({ message: 'تنسيق التاريخ غير صحيح (ISO 8601 مطلوب)' }),
  }),
)

export type AttendanceBulkInput = z.infer<typeof attendanceBulkSchema>
export type ManualSessionInput = z.infer<typeof manualSessionSchema>
export type OfflineSyncInput = z.infer<typeof offlineSyncSchema>
