'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { requireRole, STAFF_ROLES } from '@/lib/permissions'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { sendSMS } from './providers/sms'
import { sendWhatsApp } from './providers/whatsapp'
import * as templates from './templates'

// ── B-05: Notifications Actions (mutations — 'use server') ──────────────────

interface NotificationPayload {
  userId: string
  type:
    | 'ATTENDANCE_PRESENT'
    | 'ATTENDANCE_ABSENT'
    | 'PAYMENT_REMINDER'
    | 'PAYMENT_OVERDUE'
    | 'CLASS_REMINDER'
    | 'ASSIGNMENT_DUE'
    | 'EXAM_PUBLISHED'
    | 'GRADE_ADDED'
  channel: 'SMS' | 'WHATSAPP' | 'IN_APP' | 'PUSH'
  recipientPhone?: string
  templateData: Record<string, string | number>
}

/**
 * إرسال إشعار واحد عبر SMS أو WhatsApp
 * ويسجّله في DB بالحالة (SENT / FAILED)
 * ⚠️ tenant من requireTenant() مش من parameter — أمان
 */
export async function sendNotification(payload: NotificationPayload) {
  const tenant = await requireTenant()
  const user = await requireAuth()
  requireRole(user.role, STAFF_ROLES)

  // حد المعدّل لكل tenant — يقلّل خطر إساءة استخدام إرسال الرسائل (SMS bombing)
  const rl = rateLimit(`notify:${tenant.id}`, 100, 60_000)
  if (!rl.allowed) {
    throw new Error('تم تجاوز الحد المسموح لإرسال الإشعارات، حاول لاحقاً')
  }

  // تحقّق أن المستلم تابع لنفس الـ tenant واشتق رقم الهاتف من DB (لا نثق بالـ client)
  const recipient = await db.user.findFirst({
    where: { id: payload.userId, tenantId: tenant.id },
    select: { id: true, phone: true, parentPhone: true },
  })
  if (!recipient) {
    throw new Error('المستلم غير موجود')
  }
  const recipientPhone = recipient.parentPhone ?? recipient.phone

  // اختار القالب المناسب حسب نوع الإشعار
  const d = payload.templateData
  let template: { title: string; body: string }

  switch (payload.type) {
    case 'ATTENDANCE_PRESENT':
      template = templates.attendancePresent(
        d.studentName as string,
        d.subject as string,
        d.time as string,
      )
      break
    case 'ATTENDANCE_ABSENT':
      template = templates.attendanceAbsent(
        d.studentName as string,
        d.subject as string,
      )
      break
    case 'PAYMENT_REMINDER':
      template = templates.paymentReminder(
        d.month as string,
        d.amount as number,
      )
      break
    case 'PAYMENT_OVERDUE':
      template = templates.paymentOverdue(d.amount as number)
      break
    case 'CLASS_REMINDER':
      template = templates.classReminder(
        d.subject as string,
        d.time as string,
      )
      break
    case 'ASSIGNMENT_DUE':
      template = {
        title: 'تم تسليم واجب جديد',
        body: `الطالب ${d.studentName as string} سلّم الواجب "${d.assignmentTitle as string}"`,
      }
      break
    case 'EXAM_PUBLISHED':
      template = {
        title: 'تم تسليم امتحان',
        body: `الطالب ${d.studentName as string} سلّم الامتحان "${d.examTitle as string}"`,
      }
      break
    case 'GRADE_ADDED':
      template = {
        title: 'تمت إضافة درجة',
        body: `تمت إضافة درجة جديدة للطالب ${d.studentName as string}`,
      }
      break
    default:
      throw new Error('نوع إشعار غير معروف')
  }

  // أرسل عبر القناة المناسبة — رقم المستلم مشتق من DB لا من الـ client
  // TODO: enforce Tenant.smsQuota here (decrement/check) once a quota-usage
  // counter is tracked per tenant; currently smsQuota is a static cap only.
  let success = payload.channel === 'IN_APP' || payload.channel === 'PUSH'
  try {
    if (payload.channel === 'SMS') {
      success = await sendSMS(recipientPhone, template.body)
    } else if (payload.channel === 'WHATSAPP') {
      success = await sendWhatsApp(recipientPhone, template.body)
    }
  } catch {
    success = false
  }

  // سجّل النتيجة في DB
  await db.notification.create({
    data: {
      tenantId: tenant.id,
      userId: recipient.id,
      type: payload.type,
      message: template.body,
      channel: payload.channel === 'IN_APP' ? 'PUSH' : payload.channel,
      recipientPhone,
      status: success ? 'SENT' : 'FAILED',
      sentAt: success ? new Date() : null,
    },
  })

  return { success }
}

/**
 * إرسال إشعارات bulk لقائمة طلاب
 * يستخدم Promise.allSettled — فشل واحد لا يوقف الباقيين
 * ⚠️ tenant يجي من requireTenant() مش من client (أمان)
 */
export async function sendBulkReminder(
  studentIds: string[],
  type: NotificationPayload['type'],
) {
  const tenant = await requireTenant()
  await requireAuth()

  const students = (await db.user.findMany({
    where: { id: { in: studentIds }, tenantId: tenant.id },
  })) as Array<{ id: string; name: string; parentPhone: string | null }>

  const results = await Promise.allSettled(
    students
      .filter((s) => s.parentPhone !== null)
      .map((s) =>
        sendNotification({
          userId: s.id,
          type,
          channel: 'SMS',
          recipientPhone: s.parentPhone as string,
          templateData: { studentName: s.name },
        }),
      ),
  )

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  }
}

/**
 * إعادة إرسال إشعار فاشل يدوياً
 * يزيد عداد المحاولات (retries)
 */
export async function retryFailed(notificationId: string) {
  const tenant = await requireTenant()
  await requireAuth()

  const notification = await db.notification.findFirst({
    where: { id: notificationId, tenantId: tenant.id, status: 'FAILED' },
  })
  if (!notification) {
    throw new Error('الإشعار غير موجود أو لم يفشل أصلاً')
  }

  let success = false
  try {
    if (notification.channel === 'SMS') {
      success = await sendSMS(notification.recipientPhone, notification.message)
    } else {
      success = await sendWhatsApp(
        notification.recipientPhone,
        notification.message,
      )
    }
  } catch {
    success = false
  }

  await db.notification.update({
    where: { id: notificationId },
    data: {
      status: success ? 'SENT' : 'FAILED',
      sentAt: success ? new Date() : null,
      retries: { increment: 1 },
    },
  })

  return { success }
}
