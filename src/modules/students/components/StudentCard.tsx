import Link from 'next/link'

import Badge from '@/components/data-display/Badge'
import { formatPhone } from '@/lib/utils'

type StudentCardProps = {
  student: {
    id: string
    name: string
    gradeLevel: string | null
    parentPhone: string | null
    paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
    groups: Array<{
      id: string
      name: string
      subject: string
      color: string
    }>
  }
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

export default function StudentCard({ student }: StudentCardProps) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {student.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {student.gradeLevel || 'غير محدد'}
          </p>
        </div>

        <Badge variant={paymentStatusVariants[student.paymentStatus]}>
          {paymentStatusLabels[student.paymentStatus]}
        </Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            المجموعات
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {student.groups.length > 0 ? (
              student.groups.map((group) => (
                <span
                  key={group.id}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.name}
                </span>
              ))
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                غير مسجل في مجموعات
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            هاتف ولي الأمر
          </p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
            {formatPhone(student.parentPhone)}
          </p>
        </div>
      </div>

      <Link
        href={`/teacher/students/${student.id}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-100"
      >
        عرض الملف
      </Link>
    </article>
  )
}
