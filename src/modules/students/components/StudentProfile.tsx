'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import Badge from '@/components/data-display/Badge'
import EmptyState from '@/components/shared/EmptyState'
import { formatPhone } from '@/lib/utils'
import { syncStudentGroups } from '@/modules/students/actions'

import StudentForm from './StudentForm'

type ProfileGroup = {
  id: string
  name: string
  subject: string
  gradeLevel: string
  color: string
  enrollmentStatus: 'ACTIVE' | 'WAITLIST' | 'ARCHIVED' | 'DROPPED'
}

type PaymentHistoryItem = {
  id: string
  month: string
  amount: number
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
  paidAt: Date | null
  notes: string | null
}

type AttendanceItem = {
  id: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  markedAt: Date
  group: {
    name: string
  }
  session: {
    date: Date
  }
}

type AvailableGroup = {
  id: string
  name: string
  subject: string
  gradeLevel: string
  studentCount: number
  maxCapacity: number
}

type StudentProfileProps = {
  studentId: string
  profile: {
    student: {
      name: string
      phone: string
      parentName: string | null
      parentPhone: string | null
      gradeLevel: string | null
    }
    attendanceRate: number
    paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
    paymentHistory: PaymentHistoryItem[]
    enrolledGroups: ProfileGroup[]
    recentAttendance: AttendanceItem[]
  }
  availableGroups: AvailableGroup[]
}

const paymentStatusLabels = {
  PAID: 'مدفوع',
  PARTIAL: 'مدفوع جزئيًا',
  PENDING: 'مستحق',
  OVERDUE: 'متأخر',
} as const

const paymentStatusVariants = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'info',
  OVERDUE: 'danger',
} as const

const attendanceStatusLabels = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EXCUSED: 'بعذر',
} as const

const attendanceStatusVariants = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  EXCUSED: 'info',
} as const

const enrollmentStatusLabels = {
  ACTIVE: 'نشط',
  WAITLIST: 'قائمة انتظار',
  ARCHIVED: 'مؤرشف',
  DROPPED: 'منسحب',
} as const

const numberFormatter = new Intl.NumberFormat('ar-EG')
const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function StudentProfile({
  studentId,
  profile,
  availableGroups,
}: StudentProfileProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isGroupsOpen, setIsGroupsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [groupError, setGroupError] = useState<string | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState(
    profile.enrolledGroups.map((group) => group.id),
  )

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((currentValue) => {
      if (currentValue.includes(groupId)) {
        return currentValue.filter((id) => id !== groupId)
      }

      return [...currentValue, groupId]
    })
  }

  function handleSaveGroups() {
    setGroupError(null)

    startTransition(() => {
      void (async () => {
        try {
          await syncStudentGroups(studentId, selectedGroupIds)
          setIsGroupsOpen(false)
          router.refresh()
        } catch (error) {
          setGroupError(
            error instanceof Error
              ? error.message
              : 'تعذر تحديث مجموعات الطالب',
          )
        }
      })()
    })
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold md:text-3xl">
                {profile.student.name}
              </h1>
              <Badge variant={paymentStatusVariants[profile.paymentStatus]}>
                {paymentStatusLabels[profile.paymentStatus]}
              </Badge>
            </div>

            <p className="text-sm text-sky-100">
              {profile.student.gradeLevel || 'غير محدد'} - ولي الأمر:{' '}
              {profile.student.parentName || 'غير محدد'}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs text-sky-100">نسبة الحضور</p>
                <p className="mt-1 text-xl font-bold">
                  {numberFormatter.format(profile.attendanceRate)}%
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs text-sky-100">هاتف الطالب</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatPhone(profile.student.phone)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs text-sky-100">هاتف ولي الأمر</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatPhone(profile.student.parentPhone)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-50"
            >
              تعديل البيانات
            </button>

            <button
              type="button"
              onClick={() => setIsGroupsOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              تغيير المجموعات
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                المجموعات الحالية
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {numberFormatter.format(profile.enrolledGroups.length)} مجموعة
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {profile.enrolledGroups.length > 0 ? (
                profile.enrolledGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {group.name}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {group.subject} - {group.gradeLevel}
                    </p>
                    <div className="mt-2">
                      <Badge variant="primary">
                        {enrollmentStatusLabels[group.enrollmentStatus]}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  غير مسجل في أي مجموعة حاليًا.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                سجل الحضور
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                آخر 10 مرات
              </span>
            </div>

            {profile.recentAttendance.length > 0 ? (
              <div className="mt-4 space-y-3">
                {profile.recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {record.group.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {dateFormatter.format(new Date(record.session.date))}
                        </p>
                      </div>

                      <Badge variant={attendanceStatusVariants[record.status]}>
                        {attendanceStatusLabels[record.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="لا يوجد سجل حضور بعد"
                  message="سيظهر آخر 10 سجلات حضور للطالب هنا بمجرد بدء تسجيل الحضور."
                />
              </div>
            )}
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              سجل المصاريف
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {numberFormatter.format(profile.paymentHistory.length)} سجل
            </span>
          </div>

          {profile.paymentHistory.length > 0 ? (
            <div className="mt-4 space-y-3">
              {profile.paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        شهر {payment.month}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {numberFormatter.format(payment.amount)} ج.م
                      </p>
                    </div>

                    <Badge variant={paymentStatusVariants[payment.status]}>
                      {paymentStatusLabels[payment.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <p>
                      تاريخ الدفع:{' '}
                      {payment.paidAt
                        ? dateFormatter.format(new Date(payment.paidAt))
                        : 'لم يتم السداد بعد'}
                    </p>
                    {payment.notes ? <p>ملاحظات: {payment.notes}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="لا توجد حركة مصاريف"
                message="سيظهر سجل المدفوعات والمستحقات هنا عند تسجيل أول عملية."
              />
            </div>
          )}
        </section>
      </div>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                  تعديل بيانات الطالب
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  حدّث بيانات الطالب الأساسية دون تغيير المجموعات من هنا.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                x
              </button>
            </div>

            <StudentForm
              mode="edit"
              studentId={studentId}
              availableGroups={availableGroups}
              defaultValues={{
                name: profile.student.name,
                phone: profile.student.phone,
                parentName: profile.student.parentName,
                parentPhone: profile.student.parentPhone,
                gradeLevel: profile.student.gradeLevel,
              }}
              showGroupSelector={false}
              onSuccess={() => setIsEditOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {isGroupsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                  تغيير المجموعات
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  اختر المجموعات الحالية للطالب. سيتم الحفظ داخل عملية واحدة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsGroupsOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                x
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {availableGroups.map((group) => {
                const selected = selectedGroupIds.includes(group.id)

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={joinClasses(
                      'rounded-2xl border px-4 py-3 text-start transition-colors',
                      selected
                        ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700',
                    )}
                  >
                    <span className="block text-sm font-semibold">{group.name}</span>
                    <span className="mt-1 block text-xs opacity-90">
                      {group.subject} - {group.gradeLevel}
                    </span>
                  </button>
                )
              })}
            </div>

            {groupError ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {groupError}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGroupsOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveGroups}
                disabled={isPending}
                className={joinClasses(
                  'inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500',
                  isPending && 'cursor-not-allowed opacity-70',
                )}
              >
                {isPending ? 'جارٍ حفظ المجموعات...' : 'حفظ المجموعات'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
