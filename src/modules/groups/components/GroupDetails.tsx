'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import Badge from '@/components/data-display/Badge'
import EmptyState from '@/components/shared/EmptyState'
import SearchBar from '@/components/shared/SearchBar'
import { ROUTES } from '@/config/routes'
import { deleteGroup } from '@/modules/groups/actions'
import { formatGroupScheduleEntry, type GroupScheduleInput } from '@/modules/groups/schedule'
import {
  enrollInGroup,
  removeFromGroup,
  approveEnrollment,
  rejectEnrollment,
} from '@/modules/students/actions'
import {
  formatCurrency,
  formatDate,
  formatTimeRange12Hour,
  formatPhone,
} from '@/lib/utils'

type GroupStudent = {
  id: string
  studentId: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'WAITLIST' | 'ARCHIVED' | 'DROPPED'
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
  student: {
    id: string
    name: string
    phone: string
    parentPhone: string | null
    gradeLevel: string | null
  }
}

type AvailableStudent = {
  id: string
  name: string
  phone: string
  gradeLevel: string | null
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
  groups: Array<{
    id: string
    name: string
  }>
}

type RecentSession = {
  id: string
  date: Date
  timeStart: string
  timeEnd: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  type: 'REGULAR' | 'MAKEUP' | 'EXTRA'
  attendanceCount: number
  attendedCount: number
}

type GroupDetailsProps = {
  group: {
    id: string
    name: string
    subject: string
    gradeLevel: string
    days: string[]
    timeStart: string
    timeEnd: string
    schedule: GroupScheduleInput[]
    room: string | null
    maxCapacity: number
    monthlyFee: number
    color: string
    activeStudentCount: number
    waitlistCount: number
    students: GroupStudent[]
    recentSessions: RecentSession[]
  }
  availableStudents: AvailableStudent[]
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

const enrollmentStatusLabels = {
  PENDING: 'قيد المراجعة',
  ACTIVE: 'نشط',
  REJECTED: 'مرفوض',
  WAITLIST: 'قائمة انتظار',
  ARCHIVED: 'مؤرشف',
  DROPPED: 'منسحب',
} as const

const enrollmentStatusVariants = {
  PENDING: 'info',
  ACTIVE: 'success',
  REJECTED: 'danger',
  WAITLIST: 'warning',
  ARCHIVED: 'neutral',
  DROPPED: 'danger',
} as const

const sessionStatusLabels = {
  SCHEDULED: 'مجدولة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
} as const

const sessionStatusVariants = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
} as const

const sessionTypeLabels = {
  REGULAR: 'اعتيادية',
  MAKEUP: 'تعويضية',
  EXTRA: 'إضافية',
} as const

const numberFormatter = new Intl.NumberFormat('ar-EG')

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatScheduleEntries(schedule: GroupScheduleInput[]) {
  if (schedule.length === 0) {
    return ['غير محدد']
  }

  return schedule.map((entry) => formatGroupScheduleEntry(entry))
}

export default function GroupDetails({
  group,
  availableStudents,
}: GroupDetailsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const enrolledStudentIds = useMemo(
    () => new Set(group.students.map((student) => student.studentId)),
    [group.students],
  )

  const candidateStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return availableStudents
      .filter((student) => !enrolledStudentIds.has(student.id))
      .filter((student) => {
        if (!normalizedSearch) {
          return true
        }

        return (
          student.name.toLowerCase().includes(normalizedSearch) ||
          formatPhone(student.phone).includes(normalizedSearch)
        )
      })
  }, [availableStudents, enrolledStudentIds, search])

  const isGroupAtCapacity = group.activeStudentCount >= group.maxCapacity
  const scheduleEntries = formatScheduleEntries(group.schedule)

  function runGroupAction(action: () => Promise<unknown>, onSuccess?: () => void) {
    setActionError(null)

    startTransition(() => {
      void (async () => {
        try {
          await action()
          onSuccess?.()
          router.refresh()
        } catch (error) {
          setActionError(
            error instanceof Error ? error.message : 'تعذر تنفيذ العملية الآن',
          )
        }
      })()
    })
  }

  function handleDeleteGroup() {
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف الحصص والطلاب المرتبطين بها من هذه المجموعة.')) {
      return
    }

    setActionError(null)

    startTransition(() => {
      void (async () => {
        const result = await deleteGroup(group.id)

        if (!result.success) {
          setActionError(result.message ?? 'تعذر حذف المجموعة')
          return
        }

        router.push(ROUTES.teacher.groups)
        router.refresh()
      })()
    })
  }

  const pendingStudents = group.students.filter(
    s => s.status === 'PENDING'
  )
  const activeStudents = group.students.filter(
    s => s.status !== 'PENDING'
  )

  return (
    <section className="space-y-6">
      <div
        className="rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:px-8"
        style={{ borderTopWidth: '5px', borderTopColor: group.color }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-sky-700 dark:text-sky-300">
              تفاصيل المجموعة
            </p>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
              {group.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {group.subject} - {group.gradeLevel}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`${ROUTES.teacher.groups}/${group.id}/edit`}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
            >
              تعديل المجموعة
            </Link>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteGroup}
              className={joinClasses(
                'inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50',
                isPending && 'cursor-not-allowed opacity-70',
              )}
            >
              {isPending ? 'جاري حذف المجموعة...' : 'حذف المجموعة'}
            </button>
            <Link
              href={ROUTES.teacher.groups}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              العودة إلى المجموعات
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">الجدول الأسبوعي</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {scheduleEntries.join('، ')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">عدد الحصص</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {`${numberFormatter.format(group.schedule.length)} حصة أسبوعيا`}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">السعة</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {numberFormatter.format(group.activeStudentCount)} /{' '}
              {numberFormatter.format(group.maxCapacity)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">قائمة الانتظار</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {numberFormatter.format(group.waitlistCount)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">المصاريف</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(group.monthlyFee)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Badge variant="primary">{group.room || 'بدون قاعة محددة'}</Badge>
          {isGroupAtCapacity ? (
            <Badge variant="warning">
              السعة مكتملة، والطلاب الجدد سيدخلون قائمة الانتظار
            </Badge>
          ) : null}
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              طلاب المجموعة
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {numberFormatter.format(group.activeStudentCount)} طالب نشط
              {group.waitlistCount > 0
                ? `، ${numberFormatter.format(group.waitlistCount)} على قائمة الانتظار`
                : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
          >
            إضافة طالب إلى المجموعة
          </button>
        </div>

        {actionError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {actionError}
          </div>
        ) : null}

        {group.students.length > 0 ? (
          <div className="mt-4 space-y-3">
            {pendingStudents.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-yellow-600 mb-3">
                  طلبات الانضمام ({pendingStudents.length})
                </h3>
                {pendingStudents.map(enrollment => (
                  <div key={enrollment.id} 
                       className="flex items-center justify-between p-3 
                                  border border-yellow-200 rounded-lg mb-2 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/50">
                    <div className="flex flex-col">
                      <span className="font-semibold">{enrollment.student.name}</span>
                      <span className="text-xs text-slate-500">{formatPhone(enrollment.student.phone)}</span>
                    </div>
                    <div className="flex gap-2">
                      <form action={async () => { await approveEnrollment(group.id, enrollment.student.id) }}>
                        <button type="submit"
                          className="text-xs px-3 py-2 rounded-xl 
                                     bg-green-600 text-white hover:bg-green-700 transition-colors">
                          قبول
                        </button>
                      </form>
                      <form action={async () => { await rejectEnrollment(group.id, enrollment.student.id) }}>
                        <button type="submit"
                          className="text-xs px-3 py-2 rounded-xl 
                                     bg-red-600 text-white hover:bg-red-700 transition-colors">
                          رفض
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeStudents.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${ROUTES.teacher.students}/${enrollment.student.id}`}
                      className="font-semibold text-slate-950 transition-colors hover:text-sky-800 dark:text-slate-100 dark:hover:text-sky-300"
                    >
                      {enrollment.student.name}
                    </Link>
                    <Badge variant={enrollmentStatusVariants[enrollment.status]}>
                      {enrollmentStatusLabels[enrollment.status]}
                    </Badge>
                    <Badge
                      variant={paymentStatusVariants[enrollment.paymentStatus]}
                    >
                      {paymentStatusLabels[enrollment.paymentStatus]}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {enrollment.student.gradeLevel || 'غير محدد'} - هاتف الطالب:{' '}
                    {formatPhone(enrollment.student.phone)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    هاتف ولي الأمر: {formatPhone(enrollment.student.parentPhone)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runGroupAction(() =>
                      removeFromGroup(enrollment.student.id, group.id),
                    )
                  }
                  className={joinClasses(
                    'inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40',
                    isPending && 'cursor-not-allowed opacity-70',
                  )}
                >
                  {isPending ? 'جاري التحديث...' : 'إزالة من المجموعة'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="لا يوجد طلاب في هذه المجموعة"
              message="ابدأ بإضافة طلاب إلى المجموعة لمتابعة الحضور والمصاريف من مكان واحد."
              action={
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
                >
                  إضافة أول طالب
                </button>
              }
            />
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              آخر الحصص
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              آخر {numberFormatter.format(group.recentSessions.length)} حصص مرتبطة
              بالمجموعة
            </p>
          </div>
        </div>

        {group.recentSessions.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {group.recentSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(session.date)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {formatTimeRange12Hour(session.timeStart, session.timeEnd)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={sessionStatusVariants[session.status]}>
                      {sessionStatusLabels[session.status]}
                    </Badge>
                    <Badge variant="neutral">
                      {sessionTypeLabels[session.type]}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-slate-950">
                    <p className="text-slate-500 dark:text-slate-400">سجلات الحضور</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {numberFormatter.format(session.attendanceCount)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-slate-950">
                    <p className="text-slate-500 dark:text-slate-400">الحضور الفعلي</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {numberFormatter.format(session.attendedCount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="لا توجد حصص مسجلة بعد"
              message="ستظهر آخر الحصص هنا فور إنشاء الجلسات وبدء تسجيل الحضور لهذه المجموعة."
            />
          </div>
        )}
      </section>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                  إضافة طالب إلى المجموعة
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  اختر طالبًا غير مسجل حاليًا في هذه المجموعة. سيتم تطبيق السعة
                  تلقائيًا، وإذا كانت مكتملة فسيُنقل الطالب إلى قائمة الانتظار.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                x
              </button>
            </div>

            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="ابحث باسم الطالب أو رقم هاتفه"
            />

            <div className="mt-5 space-y-3">
              {candidateStudents.length > 0 ? (
                candidateStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {student.name}
                        </p>
                        <Badge variant={paymentStatusVariants[student.paymentStatus]}>
                          {paymentStatusLabels[student.paymentStatus]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {student.gradeLevel || 'غير محدد'} - {formatPhone(student.phone)}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        المجموعات الحالية:{' '}
                        {student.groups.length > 0
                          ? student.groups.map((currentGroup) => currentGroup.name).join('، ')
                          : 'غير مسجل في أي مجموعة'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runGroupAction(
                          () => enrollInGroup(student.id, group.id),
                          () => {
                            setIsAddModalOpen(false)
                            setSearch('')
                          },
                        )
                      }
                      className={joinClasses(
                        'inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500',
                        isPending && 'cursor-not-allowed opacity-70',
                      )}
                    >
                      {isPending ? 'جاري الإضافة...' : 'إضافة إلى المجموعة'}
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="لا يوجد طلاب متاحون للإضافة"
                  message={
                    search.trim()
                      ? 'لم يتم العثور على طلاب مطابقين للبحث الحالي.'
                      : 'كل الطلاب المسجلين متواجدون بالفعل داخل هذه المجموعة.'
                  }
                />
              )}
            </div>

            {actionError ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {actionError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
