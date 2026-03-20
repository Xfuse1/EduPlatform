# 🅱️ PERSON B — خطة العمل الكاملة
**الدور:** Attendance & Payments & Notifications  
**التاريخ:** 15 مارس 2026  
**الحالة:** 🟡 جاهز للبدء

---

## 📋 ملخص دورك

أنت مسؤول عن **"مين حضر؟ ومين دفع؟"** — ده قلب المنصة كله.

| الموديول | الملفات | الصفحات | APIs |
|----------|---------|---------|------|
| `modules/attendance/` | actions, queries, validations, 5 components | `attendance/**` | `api/sessions/**`, `api/attendance/**` |
| `modules/payments/` | actions, queries, validations, 5 components | `payments/**` | `api/payments/**` |
| `modules/notifications/` | actions, queries, templates, 2 providers | — | `api/notifications/**` |

---

## ⚠️ قواعد لازم تلتزم بيها (من CLAUDE.md)

```
1. كل query فيها tenantId — بدونه DATA LEAK
2. RTL: ms-4 مش ml-4 | text-start مش text-left
3. Server Components افتراضي — 'use client' للفورمز فقط
4. لا تعدل ملفات A أو C — تقدر تستورد queries بس
5. كل input ليه Zod validation
6. كل action فيه requireTenant() + requireAuth()
7. ممنوع استخدام any
8. queries.ts = read-only فقط (مفيهاش 'use server') — 'use server' بس في actions.ts
9. queries.ts ممنوع تعمل DB writes (create/update/delete) — ده شغل actions.ts
10. استخدم api-response.ts helpers (successResponse, errorResponse) في API routes
```

---

## 🗂️ الهيكل الحالي للمشروع

```
✅ موجود وشغال:
  src/lib/db.ts          ← Prisma singleton
  src/lib/tenant.ts      ← requireTenant()
  src/lib/auth.ts        ← requireAuth()
  src/lib/api-response.ts ← successResponse(), errorResponse()
  src/types/index.ts     ← كل الـ Types جاهزة

✅ فولدرات موجودة (ملفات placeholder فارغة):
  src/modules/attendance/   (actions, queries, validations, components/)
  src/modules/payments/     (actions, queries, validations, components/)
  src/modules/notifications/ (actions, queries, templates, providers/)
  src/app/(tenant)/(dashboard)/attendance/  (page, take/[sessionId], history, reports)
  src/app/(tenant)/(dashboard)/payments/    (page, record, overdue, reports)
  src/app/(tenant)/api/sessions/
  src/app/(tenant)/api/attendance/
  src/app/(tenant)/api/payments/
  src/app/(tenant)/api/notifications/

❌ لازم تعمله (كل الملفات 11 bytes = فارغة):
  كل محتوى B-01 → B-09 من tasks.md
```

---

## 📦 الـ Types الجاهزة (من src/types/index.ts)

```typescript
// استورد منها بدل ما تعرف من جديد
import type {
  Session, Attendance, Payment, Notification,
  AttendanceStatus, PaymentStatus, PaymentMethod,
  NotificationType, NotificationChannel,
  AttendanceRecord, RevenueSummary
} from '@/types'
```

---

## 🔢 ترتيب التنفيذ (لازم تتبعه بالظبط)

```
المرحلة 1: Logic (الـ Backend)
  B-01 → attendance/queries.ts + actions.ts + validations.ts
  B-03 → payments/queries.ts + actions.ts + validations.ts
  B-05 → notifications/ (templates + providers + actions + queries)

المرحلة 2: UI (الـ Frontend)
  B-02 → attendance pages + components
  B-04 → payments pages + components

المرحلة 3: Polish (يوم 3)
  B-06 → Wire notifications في attendance
  B-07 → Attendance history + reports pages
  B-08 → Payment reports page
  B-09 → Edge cases + offline sync
```

---

## 📝 B-01: Attendance Module — Logic

**الملف:** `src/modules/attendance/queries.ts`

> ⚠️ **مهم:** الـ queries.ts مفيهاش `'use server'` — دي read-only functions بتشتغل في Server Components تلقائياً.
> الـ `'use server'` بس في `actions.ts` (للـ mutations).

```typescript
import { db } from '@/lib/db'
import { cache } from 'react'

// 1. getTodaySessions — يجيب حصص النهارده (read-only)
// ⚠️ لازم تستدعي generateTodaySessions() من actions.ts قبل ما تستدعي دي
export const getTodaySessions = cache(async (tenantId: string) => {
  // حساب بداية ونهاية اليوم بتوقيت مصر
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  return db.session.findMany({
    where: { tenantId, date: { gte: today, lte: todayEnd } },
    include: {
      group: { include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } } },
      _count: { select: { attendance: { where: { status: 'PRESENT' } } } }
    },
    orderBy: { timeStart: 'asc' }
  })
})

// 2. getSessionAttendance — طلاب الحصة مع حالة الحضور والمصاريف
export const getSessionAttendance = cache(async (tenantId: string, sessionId: string) => {
  const session = await db.session.findFirst({
    where: { id: sessionId, tenantId },
    include: { group: true }
  })
  if (!session) return null

  const students = await db.groupStudent.findMany({
    where: { groupId: session.groupId, status: 'ACTIVE' },
    include: { student: true }
  })

  const attendanceRecords = await db.attendance.findMany({
    where: { sessionId, tenantId }
  })

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const payments = await db.payment.findMany({
    where: {
      tenantId, month: currentMonth,
      studentId: { in: students.map(s => s.studentId) }
    }
  })

  return {
    session,
    students: students.map(gs => {
      const att = attendanceRecords.find(a => a.studentId === gs.studentId)
      const payment = payments.find(p => p.studentId === gs.studentId)
      return {
        ...gs.student,
        attendanceStatus: att?.status ?? 'ABSENT',
        attendanceId: att?.id ?? null,
        paymentStatus: payment?.status ?? 'PENDING'
      }
    })
  }
})

// 3. getAttendanceReport — تقرير شهري
export const getAttendanceReport = cache(async (tenantId: string, month: string) => {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 0, 23, 59, 59)

  const sessions = await db.session.findMany({
    where: { tenantId, date: { gte: start, lte: end } },
    include: {
      group: true,
      _count: {
        select: {
          attendance: { where: { status: 'PRESENT' } }
        }
      }
    }
  })
  return sessions
})

// 4. getStudentAttendanceRate — نسبة حضور طالب
// ⚠️ بنستخدم createdAt مش markedAt — عشان فيه index على [studentId, createdAt]
export const getStudentAttendanceRate = cache(async (tenantId: string, studentId: string) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [total, present] = await Promise.all([
    db.attendance.count({ where: { tenantId, studentId, createdAt: { gte: thirtyDaysAgo } } }),
    db.attendance.count({ where: { tenantId, studentId, status: 'PRESENT', createdAt: { gte: thirtyDaysAgo } } })
  ])

  return total === 0 ? 0 : Math.round((present / total) * 100)
})
```

**الملف:** `src/modules/attendance/actions.ts`

```typescript
'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { attendanceBulkSchema, manualSessionSchema, offlineSyncSchema } from './validations'

// 0. generateTodaySessions — يولّد حصص النهارده (mutation — لازم تتنادى قبل getTodaySessions)
export async function generateTodaySessions() {
  const tenant = await requireTenant()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const todayName = dayNames[new Date().getDay()]

  // جيب كل المجموعات النشطة اللي عندها حصة النهارده
  const groups = await db.group.findMany({
    where: { tenantId: tenant.id, isActive: true, days: { has: todayName } }
  })

  // جيب كل الـ sessions الموجودة النهارده مرة واحدة (بدل N+1 queries)
  const existingSessions = await db.session.findMany({
    where: { tenantId: tenant.id, date: { gte: today, lte: todayEnd } },
    select: { groupId: true }
  })
  const existingGroupIds = new Set(existingSessions.map(s => s.groupId))

  // ولّد sessions للمجموعات اللي مالهاش session النهارده
  const newSessions = groups
    .filter(group => !existingGroupIds.has(group.id))
    .map(group => ({
      tenantId: tenant.id, groupId: group.id,
      date: today, timeStart: group.timeStart, timeEnd: group.timeEnd,
      status: 'SCHEDULED' as const, type: 'REGULAR' as const
    }))

  if (newSessions.length > 0) {
    await db.session.createMany({ data: newSessions, skipDuplicates: true })
  }
}

// 1. markAttendance — تسجيل حضور bulk
export async function markAttendance(
  sessionId: string,
  records: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' }[]
) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const validated = attendanceBulkSchema.parse({ sessionId, records })

  // تحقق إن الـ session تابعة للـ tenant — مع include group لـ notifications (B-06)
  const session = await db.session.findFirst({
    where: { id: validated.sessionId, tenantId: tenant.id },
    include: { group: true }
  })
  if (!session) throw new Error('الحصة غير موجودة')

  // Bulk upsert
  await Promise.all(
    validated.records.map(record =>
      db.attendance.upsert({
        where: {
          sessionId_studentId: { sessionId: validated.sessionId, studentId: record.studentId }
        },
        update: { status: record.status, markedById: user.id, markedAt: new Date(), synced: true },
        create: {
          tenantId: tenant.id, sessionId: validated.sessionId,
          groupId: session.groupId, studentId: record.studentId,
          status: record.status, markedById: user.id,
          method: 'MANUAL', markedAt: new Date(), synced: true
        }
      })
    )
  )

  // تحديث status الـ session
  await db.session.update({
    where: { id: validated.sessionId },
    data: { status: 'COMPLETED' }
  })

  revalidatePath('/attendance')
  return { success: true }
}

// 2. createManualSession — حصة يدوية (تعويضية/إضافية)
// ⚠️ Schema فيه @@unique([groupId, date]) — لازم نعمل handle للحالة دي
export async function createManualSession(
  groupId: string, date: Date, type: 'MAKEUP' | 'EXTRA'
) {
  const tenant = await requireTenant()
  await requireAuth()

  const validated = manualSessionSchema.parse({ groupId, date, type })

  const group = await db.group.findFirst({
    where: { id: validated.groupId, tenantId: tenant.id }
  })
  if (!group) throw new Error('المجموعة غير موجودة')

  // تحقق إن مفيش session موجودة بالفعل لنفس المجموعة ونفس التاريخ
  const existing = await db.session.findFirst({
    where: { groupId: validated.groupId, date: validated.date }
  })
  if (existing) throw new Error('يوجد بالفعل حصة لهذه المجموعة في هذا التاريخ')

  const session = await db.session.create({
    data: {
      tenantId: tenant.id, groupId: validated.groupId,
      date: validated.date, timeStart: group.timeStart, timeEnd: group.timeEnd,
      status: 'SCHEDULED', type: validated.type
    }
  })

  revalidatePath('/attendance')
  return { success: true, data: session }
}

// 3. syncOfflineRecords — مزامنة offline queue
export async function syncOfflineRecords(
  records: { sessionId: string; studentId: string; status: string; markedAt: string }[]
) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  // ✅ استخدم الـ Zod schema بدل manual type casting
  const validated = offlineSyncSchema.parse(records)

  const results = await Promise.allSettled(
    validated.map(async record => {
      const session = await db.session.findFirst({
        where: { id: record.sessionId, tenantId: tenant.id }
      })
      if (!session) return

      await db.attendance.upsert({
        where: { sessionId_studentId: { sessionId: record.sessionId, studentId: record.studentId } },
        update: { status: record.status, synced: true },
        create: {
          tenantId: tenant.id, sessionId: record.sessionId,
          groupId: session.groupId, studentId: record.studentId,
          status: record.status,
          markedById: user.id, method: 'MANUAL',
          markedAt: new Date(record.markedAt), synced: true
        }
      })
    })
  )

  const failed = results.filter(r => r.status === 'rejected').length
  return { success: true, synced: validated.length - failed, failed }
}
```

**الملف:** `src/modules/attendance/validations.ts`

```typescript
import { z } from 'zod'

export const attendanceBulkSchema = z.object({
  sessionId: z.string().min(1, 'sessionId مطلوب'),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['PRESENT','ABSENT','LATE','EXCUSED'])
  })).min(1, 'لازم يكون فيه سجلات')
})

export const manualSessionSchema = z.object({
  groupId: z.string().min(1, 'المجموعة مطلوبة'),
  date: z.coerce.date(),
  type: z.enum(['MAKEUP','EXTRA'])
})

export const offlineSyncSchema = z.array(z.object({
  sessionId: z.string(),
  studentId: z.string(),
  status: z.enum(['PRESENT','ABSENT','LATE','EXCUSED']),
  markedAt: z.string().datetime()
}))
```

---

## 📝 B-02: Attendance UI

### `src/app/(tenant)/(dashboard)/attendance/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { generateTodaySessions } from '@/modules/attendance/actions'
import { getTodaySessions } from '@/modules/attendance/queries'
import { SessionCard } from '@/modules/attendance/components/SessionCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Calendar } from 'lucide-react'

export default async function AttendancePage() {
  // ⚠️ أولاً ولّد الحصص (mutation) ثم اقرأها (query)
  await generateTodaySessions()
  const tenant = await requireTenant()
  const sessions = await getTodaySessions(tenant.id)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">حصص اليوم</h1>
      {sessions.length === 0 ? (
        <EmptyState icon={<Calendar className="w-12 h-12" />} message="لا توجد حصص اليوم 📅" />
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### `src/modules/attendance/components/SessionCard.tsx`

```typescript
'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  session: {
    id: string
    group: { name: string; color: string; timeStart: string; timeEnd: string }
    status: string
    _count: { attendance: number }
    // إجمالي الطلاب يجي من students count في المجموعة
    totalStudents?: number
  }
}

export function SessionCard({ session }: Props) {
  return (
    <Link href={`/attendance/take/${session.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-full min-h-[3rem] rounded-full"
            style={{ backgroundColor: session.group.color }}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{session.group.name}</h3>
            <p className="text-sm text-muted-foreground">
              {session.group.timeStart} — {session.group.timeEnd}
            </p>
          </div>
          <div className="text-start">
            <span className="text-lg font-bold">
              {session._count.attendance}
            </span>
            <Badge
              variant={session.status === 'COMPLETED' ? 'default' : 'secondary'}
              className="block mt-1 text-xs"
            >
              {session.status === 'COMPLETED' ? 'مكتملة' : 'مجدولة'}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  )
}
```

### `src/app/(tenant)/(dashboard)/attendance/take/[sessionId]/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { getSessionAttendance } from '@/modules/attendance/queries'
import { AttendanceSheet } from '@/modules/attendance/components/AttendanceSheet'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ sessionId: string }> }

export default async function TakeAttendancePage({ params }: Props) {
  const { sessionId } = await params
  const tenant = await requireTenant()
  const data = await getSessionAttendance(tenant.id, sessionId)
  if (!data) notFound()

  const unpaidCount = data.students.filter(s => s.paymentStatus !== 'PAID').length

  return (
    <div className="pb-24">
      {unpaidCount > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-sm text-yellow-800 text-center">
          ⚠️ {unpaidCount} طلاب لم يدفعوا هذا الشهر
        </div>
      )}
      <div className="p-4">
        <h1 className="text-xl font-bold mb-1">{data.session.group.name}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {data.session.group.timeStart} — {data.session.group.timeEnd}
        </p>
        <AttendanceSheet
          sessionId={sessionId}
          students={data.students}
        />
      </div>
    </div>
  )
}
```

### `src/modules/attendance/components/AttendanceSheet.tsx`

```typescript
'use client'
import { useState, useTransition } from 'react'
import { StudentAttendanceRow } from './StudentAttendanceRow'
import { markAttendance } from '@/modules/attendance/actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Student {
  id: string; name: string
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
}

interface Props { sessionId: string; students: Student[] }

export function AttendanceSheet({ sessionId, students }: Props) {
  const [statuses, setStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>(
    Object.fromEntries(students.map(s => [s.id, s.attendanceStatus === 'PRESENT' ? 'PRESENT' : 'ABSENT']))
  )
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const presentCount = Object.values(statuses).filter(s => s === 'PRESENT').length

  const toggle = (studentId: string) => {
    setStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    }))
  }

  const handleSave = () => {
    startTransition(async () => {
      const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }))
      await markAttendance(sessionId, records)
      router.push('/attendance')
    })
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4 p-3 bg-muted rounded-lg">
        <span className="font-semibold">الحضور:</span>
        <span className="text-lg font-bold text-primary">
          {presentCount} / {students.length}
        </span>
      </div>

      <div className="space-y-2">
        {students.map(student => (
          <StudentAttendanceRow
            key={student.id}
            student={student}
            status={statuses[student.id] ?? 'ABSENT'}
            onToggle={() => toggle(student.id)}
          />
        ))}
      </div>

      {/* زر الحفظ الثابت */}
      <div className="fixed bottom-0 start-0 end-0 p-4 bg-background border-t">
        <Button
          className="w-full h-14 text-lg"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ الحضور ✅'}
        </Button>
      </div>
    </>
  )
}
```

### `src/modules/attendance/components/StudentAttendanceRow.tsx`

```typescript
'use client'
import { cn } from '@/lib/utils'

interface Props {
  student: { id: string; name: string; paymentStatus: string }
  status: 'PRESENT' | 'ABSENT'
  onToggle: () => void
}

export function StudentAttendanceRow({ student, status, onToggle }: Props) {
  const isPresent = status === 'PRESENT'

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all min-h-[56px]',
        isPresent
          ? 'bg-green-50 border-green-400 dark:bg-green-900/20'
          : 'bg-red-50 border-red-200 dark:bg-red-900/10'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isPresent ? '✅' : '❌'}</span>
        <span className="font-medium text-start">{student.name}</span>
      </div>
      <span className="text-lg">
        {student.paymentStatus === 'PAID' ? '🟢' : '🔴'}
      </span>
    </button>
  )
}
```

---

## 📝 B-03: Payments Module — Logic

**الملف:** `src/modules/payments/queries.ts`

```typescript
import { db } from '@/lib/db'
import { cache } from 'react'

// 1. getPayments
export const getPayments = cache(async (
  tenantId: string,
  filters?: { studentId?: string; month?: string; status?: string }
) => {
  return db.payment.findMany({
    where: {
      tenantId,
      ...(filters?.studentId && { studentId: filters.studentId }),
      ...(filters?.month && { month: filters.month }),
      ...(filters?.status && { status: filters.status as 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' })
    },
    include: { student: { select: { id: true, name: true, phone: true, parentPhone: true } } },
    orderBy: { createdAt: 'desc' }
  })
})

// 2. getStudentLedger — تاريخ المدفوعات للطالب
export const getStudentLedger = cache(async (tenantId: string, studentId: string) => {
  return db.payment.findMany({
    where: { tenantId, studentId },
    orderBy: { month: 'desc' }
  })
})

// 3. getOverdueStudents — الطلاب المتأخرين
export const getOverdueStudents = cache(async (tenantId: string) => {
  return db.payment.findMany({
    where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] } },
    include: { student: { select: { id: true, name: true, parentPhone: true, gradeLevel: true } } },
    orderBy: { amount: 'desc' }
  })
})

// 4. getRevenueSummary — ملخص الإيرادات
export const getRevenueSummary = cache(async (tenantId: string, month?: string) => {
  const targetMonth = month ?? new Date().toISOString().slice(0, 7)

  const payments = await db.payment.findMany({
    where: { tenantId, month: targetMonth }
  })

  const collected = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0)

  const outstanding = payments
    .filter(p => p.status !== 'PAID')
    .reduce((sum, p) => sum + p.amount, 0)

  const total = collected + outstanding
  const collectionRate = total === 0 ? 0 : Math.round((collected / total) * 100)

  // مقارنة بالشهر السابق
  const [y, m] = targetMonth.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = prevDate.toISOString().slice(0, 7)

  const prevPayments = await db.payment.findMany({
    where: { tenantId, month: prevMonth, status: 'PAID' }
  })
  const lastMonth = prevPayments.reduce((sum, p) => sum + p.amount, 0)
  const comparedToLastMonth = lastMonth === 0 ? 0 :
    Math.round(((collected - lastMonth) / lastMonth) * 100)

  return { collected, outstanding, total, collectionRate, comparedToLastMonth, lastMonth }
})
```

**الملف:** `src/modules/payments/actions.ts`

```typescript
'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { paymentRecordSchema } from './validations'

// 1. recordPayment — تسجيل دفعة
export async function recordPayment(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const data = paymentRecordSchema.parse({
    studentId: formData.get('studentId'),
    amount: Number(formData.get('amount')),
    month: formData.get('month'),
    method: formData.get('method'),
    notes: formData.get('notes')
  })

  // توليد رقم إيصال فريد
  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const receiptNumber = `RCP-${tenant.slug}-${date}-${String(count + 1).padStart(4, '0')}`

  // حساب الحالة
  const student = await db.user.findFirst({
    where: { id: data.studentId, tenantId: tenant.id },
    include: { enrollments: { where: { status: 'ACTIVE' }, include: { group: true } } }
  })
  if (!student) throw new Error('الطالب غير موجود')

  const monthlyFee = student.enrollments[0]?.group?.monthlyFee ?? 0
  const existingPayments = await db.payment.findMany({
    where: { tenantId: tenant.id, studentId: data.studentId, month: data.month }
  })
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + data.amount

  let status: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING'
  if (totalPaid >= monthlyFee) status = 'PAID'
  else if (totalPaid > 0) status = 'PARTIAL'

  const payment = await db.payment.create({
    data: {
      tenantId: tenant.id, studentId: data.studentId,
      amount: data.amount, month: data.month,
      status, method: data.method,
      receiptNumber, recordedById: user.id,
      notes: data.notes ?? null, paidAt: new Date()
    }
  })

  revalidatePath('/payments')
  return { success: true, data: { payment, receiptNumber } }
}

// 2. sendPaymentReminder — إرسال تذكير
export async function sendPaymentReminder(studentIds: string[]) {
  const tenant = await requireTenant()
  await requireAuth()

  // استورد من notifications (لما تخلص B-05)
  // Promise.allSettled حتى لو فشل واحد مش يوقف الباقيين
  const results = await Promise.allSettled(
    studentIds.map(async studentId => {
      const student = await db.user.findFirst({
        where: { id: studentId, tenantId: tenant.id }
      })
      if (!student?.parentPhone) return

      // سيتم ربطه بـ sendNotification في B-05
      await db.notification.create({
        data: {
          tenantId: tenant.id, userId: studentId,
          type: 'PAYMENT_REMINDER',
          message: `💰 تذكير بسداد المصاريف المستحقة — ${tenant.name}`,
          channel: 'SMS', status: 'QUEUED',
          recipientPhone: student.parentPhone
        }
      })
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  revalidatePath('/payments/overdue')
  return { success: true, sent }
}

// 3. generateReceipt — بيانات الإيصال
export async function generateReceipt(paymentId: string) {
  const tenant = await requireTenant()
  await requireAuth()

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId: tenant.id },
    include: {
      student: { select: { name: true, phone: true } },
      recordedBy: { select: { name: true } }
    }
  })

  if (!payment) throw new Error('الإيصال غير موجود')
  return { success: true, data: { payment, tenantName: tenant.name } }
}
```

**الملف:** `src/modules/payments/validations.ts`

```typescript
import { z } from 'zod'

export const paymentRecordSchema = z.object({
  studentId: z.string().min(1, 'الطالب مطلوب'),
  amount: z.number().int().positive('المبلغ لازم يكون موجب'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'صيغة الشهر غير صحيحة (YYYY-MM)'),
  method: z.enum(['CASH','VODAFONE_CASH','FAWRY','INSTAPAY','CARD']),
  notes: z.string().optional()
})
```

---

## 📝 B-04: Payments UI

### `src/app/(tenant)/(dashboard)/payments/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary, getPayments } from '@/modules/payments/queries'
import { RevenueCards } from '@/modules/payments/components/RevenueCards'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PaymentsPage() {
  const tenant = await requireTenant()
  const [summary, recentPayments] = await Promise.all([
    getRevenueSummary(tenant.id),
    getPayments(tenant.id)
  ])

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المصاريف</h1>
        <Link href="/payments/record">
          <Button>تسجيل دفعة +</Button>
        </Link>
      </div>

      <RevenueCards summary={summary} />

      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">آخر المدفوعات</h2>
          <Link href="/payments/overdue" className="text-sm text-destructive font-medium">
            المتأخرون →
          </Link>
        </div>
        <div className="space-y-2">
          {recentPayments.slice(0, 10).map(p => (
            <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">{p.student?.name}</p>
                <p className="text-xs text-muted-foreground">{p.month} • {p.receiptNumber}</p>
              </div>
              <span className="font-bold text-green-600">{p.amount} جنيه</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### `src/modules/payments/components/RevenueCards.tsx`

```typescript
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  summary: {
    collected: number; outstanding: number
    total: number; collectionRate: number; comparedToLastMonth: number
  }
}

export function RevenueCards({ summary }: Props) {
  const trend = summary.comparedToLastMonth >= 0

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <CheckCircle className="text-green-500 w-5 h-5" />
          {trend
            ? <TrendingUp className="text-green-400 w-4 h-4" />
            : <TrendingDown className="text-red-400 w-4 h-4" />}
        </div>
        <p className="text-2xl font-bold mt-2">{summary.collected.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">جنيه محصّل</p>
        <p className={`text-xs mt-1 ${trend ? 'text-green-600' : 'text-red-600'}`}>
          {trend ? '+' : ''}{summary.comparedToLastMonth}% عن الشهر الماضي
        </p>
      </Card>

      <Card className="p-4">
        <AlertCircle className="text-red-500 w-5 h-5" />
        <p className="text-2xl font-bold mt-2">{summary.outstanding.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">جنيه متأخر</p>
      </Card>

      <Card className="p-4 col-span-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">نسبة التحصيل</span>
          <span className="text-2xl font-bold">{summary.collectionRate}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${summary.collectionRate}%` }}
          />
        </div>
      </Card>
    </div>
  )
}
```

### `src/app/(tenant)/(dashboard)/payments/overdue/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { getOverdueStudents } from '@/modules/payments/queries'
import { OverdueList } from '@/modules/payments/components/OverdueList'

export default async function OverduePage() {
  const tenant = await requireTenant()
  const overduePayments = await getOverdueStudents(tenant.id)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">المتأخرون في السداد</h1>
      <p className="text-muted-foreground text-sm">
        {overduePayments.length} طالب لديهم مدفوعات متأخرة
      </p>
      <OverdueList payments={overduePayments} />
    </div>
  )
}
```

### `src/modules/payments/components/OverdueList.tsx`

```typescript
'use client'
import { useState, useTransition } from 'react'
import { sendPaymentReminder } from '@/modules/payments/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Payment {
  id: string; amount: number; month: string; status: string
  student: { id: string; name: string; parentPhone: string | null; gradeLevel: string | null } | null
}

export function OverdueList({ payments }: { payments: Payment[] }) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState<string[]>([])

  const sendReminder = (studentId: string) => {
    startTransition(async () => {
      await sendPaymentReminder([studentId])
      setSent(prev => [...prev, studentId])
    })
  }

  const sendAll = () => {
    const ids = payments.map(p => p.student?.id).filter(Boolean) as string[]
    startTransition(async () => {
      await sendPaymentReminder(ids)
      setSent(ids)
    })
  }

  return (
    <div className="space-y-3">
      {payments.length > 0 && (
        <Button variant="outline" className="w-full" onClick={sendAll} disabled={isPending}>
          📨 إرسال تذكير للكل ({payments.length})
        </Button>
      )}
      {payments.map(p => (
        <Card key={p.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{p.student?.name}</p>
              <p className="text-sm text-muted-foreground">{p.student?.gradeLevel} • {p.month}</p>
              <p className="text-sm text-muted-foreground">{p.student?.parentPhone}</p>
            </div>
            <div className="text-end">
              <p className="font-bold text-destructive">{p.amount} جنيه</p>
              {p.student && (
                <Button
                  size="sm" variant="ghost"
                  className="mt-1 text-xs"
                  disabled={isPending || sent.includes(p.student.id)}
                  onClick={() => p.student && sendReminder(p.student.id)}
                >
                  {sent.includes(p.student?.id ?? '') ? '✅ تم الإرسال' : 'إرسال تذكير'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

---

## 📝 B-04.5: Payment Record (Page + Form) — الصفحة الأهم!

> ⚠️ **بدون الصفحة دي المعلم مش هيقدر يسجل دفعات!**

### `src/app/(tenant)/(dashboard)/payments/record/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { PaymentForm } from '@/modules/payments/components/PaymentForm'
import { getStudents } from '@/modules/students/queries'

export default async function RecordPaymentPage() {
  const tenant = await requireTenant()
  // استورد قائمة الطلاب من Person A's queries
  const students = await getStudents(tenant.id)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">تسجيل دفعة</h1>
      <PaymentForm students={students} />
    </div>
  )
}
```

### `src/modules/payments/components/PaymentForm.tsx`

```typescript
'use client'
import { useState, useTransition } from 'react'
import { recordPayment } from '@/modules/payments/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

interface Student {
  id: string; name: string; gradeLevel: string | null
}

export function PaymentForm({ students }: { students: Student[] }) {
  const [isPending, startTransition] = useTransition()
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null)
  const router = useRouter()

  const currentMonth = new Date().toISOString().slice(0, 7)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await recordPayment(formData)
      if (result.success) {
        setReceiptNumber(result.data.receiptNumber)
      }
    })
  }

  if (receiptNumber) {
    return (
      <div className="text-center space-y-4 p-6">
        <span className="text-4xl">✅</span>
        <h2 className="text-xl font-bold">تم تسجيل الدفعة بنجاح</h2>
        <p className="text-muted-foreground">رقم الإيصال: {receiptNumber}</p>
        <Button onClick={() => router.push('/payments')}>الرجوع للمصاريف</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="studentId">الطالب</Label>
        <Select name="studentId" required>
          <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
          <SelectContent>
            {students.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name} — {s.gradeLevel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="amount">المبلغ (جنيه)</Label>
        <Input name="amount" type="number" min="1" required placeholder="400" />
      </div>

      <div>
        <Label htmlFor="month">الشهر</Label>
        <Input name="month" type="month" defaultValue={currentMonth} required />
      </div>

      <input type="hidden" name="method" value="CASH" />

      <div>
        <Label htmlFor="notes">ملاحظات (اختياري)</Label>
        <Input name="notes" placeholder="ملاحظات..." />
      </div>

      <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
        {isPending ? 'جاري التسجيل...' : 'تسجيل الدفعة 💰'}
      </Button>
    </form>
  )
}
```

---

## 📝 B-05: Notifications Module

**الملف:** `src/modules/notifications/templates.ts`

```typescript
export function attendancePresent(studentName: string, subject: string, time: string) {
  return {
    title: 'تم تسجيل الحضور ✅',
    body: `✅ ابنكم/بنتكم ${studentName} حضر/ت حصة ${subject} الساعة ${time}`
  }
}

export function attendanceAbsent(studentName: string, subject: string) {
  return {
    title: 'غياب ⚠️',
    body: `⚠️ ابنكم/بنتكم ${studentName} لم يحضر/تحضر حصة ${subject} اليوم`
  }
}

export function paymentReminder(month: string, amount: number) {
  return {
    title: 'تذكير بالمصاريف 💰',
    body: `💰 تذكير: مصاريف شهر ${month} مستحقة (${amount} جنيه)`
  }
}

export function paymentOverdue(amount: number) {
  return {
    title: 'متأخرات مستحقة ⚠️',
    body: `⚠️ عليكم متأخرات بمبلغ ${amount} جنيه — برجاء السداد`
  }
}

export function classReminder(subject: string, time: string) {
  return {
    title: 'تذكير بالحصة 📅',
    body: `📅 تذكير: حصة ${subject} بكرة الساعة ${time}`
  }
}
```

**الملف:** `src/modules/notifications/providers/sms.ts`

```typescript
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  // MVP: console.log — استبدل بـ SMS provider حقيقي لاحقًا
  console.log(`[SMS] → ${phone}: ${message}`)

  // لما يكون SMS provider جاهز:
  // const response = await fetch(process.env.SMS_API_URL!, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.SMS_API_KEY}` },
  //   body: JSON.stringify({ to: phone, message })
  // })
  // return response.ok

  return true
}
```

**الملف:** `src/modules/notifications/providers/whatsapp.ts`

```typescript
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  console.log(`[WhatsApp] → ${phone}: ${message}`)
  return true
}
```

**الملف:** `src/modules/notifications/actions.ts`

```typescript
'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendSMS } from './providers/sms'
import { sendWhatsApp } from './providers/whatsapp'
import * as templates from './templates'

interface NotificationPayload {
  userId: string
  type: 'ATTENDANCE_PRESENT' | 'ATTENDANCE_ABSENT' | 'PAYMENT_REMINDER' | 'PAYMENT_OVERDUE' | 'CLASS_REMINDER'
  channel: 'SMS' | 'WHATSAPP'
  recipientPhone: string
  templateData: Record<string, string | number>
}

export async function sendNotification(payload: NotificationPayload) {
  const tenant = await requireTenant()

  // اختار القالب المناسب
  let template: { title: string; body: string }
  const d = payload.templateData
  switch (payload.type) {
    case 'ATTENDANCE_PRESENT':
      template = templates.attendancePresent(d.studentName as string, d.subject as string, d.time as string)
      break
    case 'ATTENDANCE_ABSENT':
      template = templates.attendanceAbsent(d.studentName as string, d.subject as string)
      break
    case 'PAYMENT_REMINDER':
      template = templates.paymentReminder(d.month as string, d.amount as number)
      break
    case 'PAYMENT_OVERDUE':
      template = templates.paymentOverdue(d.amount as number)
      break
    case 'CLASS_REMINDER':
      template = templates.classReminder(d.subject as string, d.time as string)
      break
  }

  // أرسل عبر القناة المناسبة
  let success = false
  try {
    if (payload.channel === 'SMS') {
      success = await sendSMS(payload.recipientPhone, template.body)
    } else {
      success = await sendWhatsApp(payload.recipientPhone, template.body)
    }
  } catch {
    success = false
  }

  // سجّل في DB
  await db.notification.create({
    data: {
      tenantId: tenant.id, userId: payload.userId,
      type: payload.type, message: template.body,
      channel: payload.channel, recipientPhone: payload.recipientPhone,
      status: success ? 'SENT' : 'FAILED',
      sentAt: success ? new Date() : null
    }
  })

  return { success }
}

export async function sendBulkReminder(
  studentIds: string[], type: NotificationPayload['type']
) {
  // ✅ tenant من requireTenant() مش من parameter (قاعدة: tenant is NEVER trusted from client)
  const tenant = await requireTenant()
  await requireAuth()

  const students = await db.user.findMany({
    where: { id: { in: studentIds }, tenantId: tenant.id }
  })

  const results = await Promise.allSettled(
    students
      .filter(s => s.parentPhone)
      .map(s => sendNotification({
        userId: s.id, type, channel: 'SMS',
        recipientPhone: s.parentPhone!,
        templateData: { studentName: s.name }
      }))
  )

  return {
    sent: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  }
}

// 3. retryFailed — إعادة إرسال الإشعارات الفاشلة
export async function retryFailed(notificationId: string) {
  const tenant = await requireTenant()
  await requireAuth()

  const notification = await db.notification.findFirst({
    where: { id: notificationId, tenantId: tenant.id, status: 'FAILED' }
  })
  if (!notification) throw new Error('الإشعار غير موجود')

  let success = false
  try {
    if (notification.channel === 'SMS') {
      success = await sendSMS(notification.recipientPhone, notification.message)
    } else {
      success = await sendWhatsApp(notification.recipientPhone, notification.message)
    }
  } catch {
    success = false
  }

  await db.notification.update({
    where: { id: notificationId },
    data: {
      status: success ? 'SENT' : 'FAILED',
      sentAt: success ? new Date() : null,
      retries: { increment: 1 }
    }
  })

  return { success }
}
```

**الملف:** `src/modules/notifications/queries.ts`

```typescript
import { db } from '@/lib/db'
import { cache } from 'react'

export const getNotificationLogs = cache(async (
  tenantId: string,
  filters?: { type?: string; status?: string }
) => {
  return db.notification.findMany({
    where: {
      tenantId,
      ...(filters?.type && { type: filters.type as 'ATTENDANCE_PRESENT' }),
      ...(filters?.status && { status: filters.status as 'SENT' })
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
})

// 2. getFailedNotifications — الإشعارات الفاشلة (لإعادة الإرسال)
export const getFailedNotifications = cache(async (tenantId: string) => {
  return db.notification.findMany({
    where: { tenantId, status: 'FAILED' },
    include: { user: { select: { name: true, parentPhone: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
})
```

---

## 📝 B-06: Wire Notifications في Attendance (يوم 3)

في `src/modules/attendance/actions.ts` — بعد `markAttendance`، أضف:

```typescript
// في نهاية markAttendance، بعد الـ upsert:
import { sendNotification } from '@/modules/notifications/actions'

// Fire & forget — لا يوقف الـ response
// ✅ session.group موجود لأننا عملنا include: { group: true } في الـ query فوق
Promise.allSettled(
  validated.records.map(async record => {
    const student = await db.user.findUnique({ where: { id: record.studentId } })
    if (!student?.parentPhone) return

    await sendNotification({
      userId: record.studentId,
      type: record.status === 'PRESENT' ? 'ATTENDANCE_PRESENT' : 'ATTENDANCE_ABSENT',
      channel: 'SMS',
      recipientPhone: student.parentPhone,
      templateData: {
        studentName: student.name,
        subject: session.group.subject,  // ✅ موجود لأننا عملنا include
        time: session.timeStart
      }
    })
  })
)
```

---

## 📝 B-07: Attendance History + Reports (يوم 3)

### `src/app/(tenant)/(dashboard)/attendance/history/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { db } from '@/lib/db'

export default async function AttendanceHistoryPage() {
  const tenant = await requireTenant()
  const sessions = await db.session.findMany({
    where: { tenantId: tenant.id, status: 'COMPLETED' },
    include: {
      group: { select: { name: true, color: true } },
      _count: { select: { attendance: { where: { status: 'PRESENT' } } } }
    },
    orderBy: { date: 'desc' },
    take: 30
  })

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">سجل الحضور</h1>
      <div className="space-y-2">
        {sessions.map(session => (
          <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-8 rounded-full" style={{ backgroundColor: session.group.color }} />
              <div>
                <p className="font-medium">{session.group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <span className="font-bold">{session._count.attendance} حاضر</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 📝 B-08: Payment Reports (يوم 3)

### `src/app/(tenant)/(dashboard)/payments/reports/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'

export default async function PaymentReportsPage() {
  const tenant = await requireTenant()
  // اجمع آخر 6 شهور
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  const summaries = await Promise.all(
    months.map(month => getRevenueSummary(tenant.id, month).then(s => ({ month, ...s })))
  )

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">تقرير الإيرادات</h1>
      <div className="space-y-3">
        {summaries.map(s => (
          <div key={s.month} className="p-4 border rounded-xl">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">{s.month}</span>
              <span className="font-bold text-green-600">{s.collected.toLocaleString()} جنيه</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>متأخر: {s.outstanding.toLocaleString()} جنيه</span>
              <span>نسبة التحصيل: {s.collectionRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${s.collectionRate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 📝 B-09: Edge Cases (يوم 3)

### قائمة المراجعة

```
□ Receipt number فريد — تأكد من uniqueness constraint في schema
□ Notification retry — لو FAILED → يقدر يتعاد يدوياً
□ Offline sync — syncOfflineRecords يتعامل مع التعارض (server wins)
□ Empty states — لو مفيش حصص / مفيش مدفوعات
□ Loading states — كل Server Action فيه isPending
□ Error boundaries — لو query فشل
□ tenantId في كل query — راجع مرة تانية
□ RTL — ms- مش ml- في كل المكونات
```

---

## 🔗 API Routes (ملفات تحتاج تعملها)

### `src/app/(tenant)/api/sessions/today/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { getTodaySessions } from '@/modules/attendance/queries'

export async function GET() {
  try {
    const tenant = await requireTenant()
    const sessions = await getTodaySessions(tenant.id)
    return NextResponse.json({ data: sessions })
  } catch {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: 'فشل تحميل الحصص' } }, { status: 500 })
  }
}
```

### `src/app/(tenant)/api/sessions/[sessionId]/attendance/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { markAttendance } from '@/modules/attendance/actions'

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    await requireTenant()
    await requireAuth()
    const { sessionId } = await params
    const body = await req.json()
    const result = await markAttendance(sessionId, body.records)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: { code: 'MARK_FAILED', message: 'فشل تسجيل الحضور' } }, { status: 500 })
  }
}
```

### `src/app/(tenant)/api/payments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getPayments } from '@/modules/payments/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const payments = await getPayments(tenant.id, {
      studentId: searchParams.get('studentId') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return NextResponse.json({ data: payments })
  } catch {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: 'فشل تحميل المدفوعات' } }, { status: 500 })
  }
}
```

### `src/app/(tenant)/api/payments/summary/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? undefined
    const summary = await getRevenueSummary(tenant.id, month)
    return NextResponse.json({ data: summary })
  } catch {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: 'فشل تحميل الملخص' } }, { status: 500 })
  }
}
```

### `src/app/(tenant)/api/attendance/offline-sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { syncOfflineRecords } from '@/modules/attendance/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    await requireAuth()
    const body = await req.json()
    const result = await syncOfflineRecords(body.records)
    return successResponse(result)
  } catch {
    return errorResponse('SYNC_FAILED', 'فشل المزامنة', 500)
  }
}
```

### `src/app/(tenant)/api/attendance/reports/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getAttendanceReport } from '@/modules/attendance/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const report = await getAttendanceReport(tenant.id, month)
    return successResponse(report)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل التقرير', 500)
  }
}
```

### `src/app/(tenant)/api/payments/overdue/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getOverdueStudents } from '@/modules/payments/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET() {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const overdueStudents = await getOverdueStudents(tenant.id)
    return successResponse(overdueStudents)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل المتأخرين', 500)
  }
}
```

### `src/app/(tenant)/api/payments/remind/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { sendPaymentReminder } from '@/modules/payments/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    await requireAuth()
    const body = await req.json()
    const result = await sendPaymentReminder(body.studentIds)
    return successResponse(result)
  } catch {
    return errorResponse('SEND_FAILED', 'فشل إرسال التذكير', 500)
  }
}
```

### `src/app/(tenant)/api/payments/[paymentId]/receipt/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { generateReceipt } from '@/modules/payments/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    await requireTenant()
    await requireAuth()
    const { paymentId } = await params
    const result = await generateReceipt(paymentId)
    return successResponse(result.data)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل الإيصال', 500)
  }
}
```

### `src/app/(tenant)/api/notifications/send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { sendNotification } from '@/modules/notifications/actions'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    await requireTenant()
    await requireAuth()
    const body = await req.json()
    const result = await sendNotification(body)
    return successResponse(result)
  } catch {
    return errorResponse('SEND_FAILED', 'فشل إرسال الإشعار', 500)
  }
}
```

### `src/app/(tenant)/api/notifications/logs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getNotificationLogs } from '@/modules/notifications/queries'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const logs = await getNotificationLogs(tenant.id, {
      type: searchParams.get('type') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return successResponse(logs)
  } catch {
    return errorResponse('FETCH_FAILED', 'فشل تحميل السجل', 500)
  }
}
```

---

## ✅ Checklist بعد كل Task

```
□ كل query فيها tenantId؟
□ كل النصوص عربي؟
□ RTL classes صح؟ (ms- مش ml-)
□ شغالة على موبايل 375px؟
□ npm run build بيعدي؟
□ فيه loading + error states؟
□ requireTenant() في أول كل action؟
□ requireAuth() في كل mutation؟
```

---

## 📊 تقدير الوقت

| Task | الوقت المتوقع |
|------|--------------|
| B-01 (Attendance Logic) | 2-3 ساعات |
| B-02 (Attendance UI) | 3-4 ساعات |
| B-03 (Payments Logic) | 2 ساعات |
| B-04 (Payments UI) | 3 ساعات |
| B-05 (Notifications) | 1-2 ساعات |
| B-06 + B-07 + B-08 + B-09 | 3-4 ساعات |
| **الإجمالي** | **~14-18 ساعة** |

---

## 🤝 ما تحتاجه من A و C

| محتاج | من | متى |
|-------|----|-----|
| `getGroupStudents(groupId)` | Person A | B-01 |
| `AppShell`, `Sidebar` | Person C | B-02 |
| `StatsCard`, `Badge`, `EmptyState` | Person C | B-02, B-04 |
| `src/types/index.ts` | Person C | ✅ موجود |
| `src/lib/db.ts` | — | ✅ موجود |
| `src/lib/tenant.ts` | — | ✅ موجود |

---

*آخر تحديث: 15 مارس 2026 | Person B Plan v2 (بعد المراجعة)*
