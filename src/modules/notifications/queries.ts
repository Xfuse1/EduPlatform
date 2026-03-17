import { db } from '@/lib/db'
import { cache } from 'react'

// ── B-05: Notifications Queries (read-only — NO 'use server') ───────────────

/**
 * سجل الإشعارات مع فلترة اختيارية (آخر 50 سجل)
 */
export const getNotificationLogs = cache(
  async (
    tenantId: string,
    filters?: { type?: string; status?: string },
  ) => {
    return db.notification.findMany({
      where: {
        tenantId,
        ...(filters?.type && {
          type: filters.type as
            | 'ATTENDANCE_PRESENT'
            | 'ATTENDANCE_ABSENT'
            | 'PAYMENT_REMINDER'
            | 'PAYMENT_OVERDUE'
            | 'CLASS_REMINDER',
        }),
        ...(filters?.status && {
          status: filters.status as 'SENT' | 'FAILED' | 'QUEUED',
        }),
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  },
)

/**
 * الإشعارات الفاشلة (لإعادة الإرسال اليدوي)
 * آخر 20 سجل فاشل
 */
export const getFailedNotifications = cache(async (tenantId: string) => {
  return db.notification.findMany({
    where: { tenantId, status: 'FAILED' },
    include: {
      user: { select: { name: true, parentPhone: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
})
