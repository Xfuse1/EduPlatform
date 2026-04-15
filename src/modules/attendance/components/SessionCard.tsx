'use client'
import Link from 'next/link'
import Badge from '@/components/data-display/Badge'
import { formatTimeRange12Hour } from '@/lib/utils'

// ── B-02: SessionCard ────────────────────────────────────────────────────────

interface SessionGroup {
  name: string
  color: string
  timeStart: string
  timeEnd: string
  _count?: { students: number }
}

interface SessionCardProps {
  session: {
    id: string
    group: SessionGroup
    status: string
    _count: { attendance: number }
  }
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/**
 * كارد الحصة اليومية — يعرض اسم المجموعة والوقت وعدد الحاضرين
 */
export function SessionCard({ session }: SessionCardProps) {
  const isCompleted = session.status === 'COMPLETED'
  const presentCount = session._count.attendance
  const totalStudents = session.group._count?.students

  return (
    <Link href={`/attendance/take/${session.id}`}>
      <div
        className={joinClasses(
          'p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm',
          'hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]',
        )}
      >
        <div className="flex items-center gap-3">
          {/* شريط اللون الجانبي */}
          <div
            className="w-1 self-stretch rounded-full min-h-[3rem] shrink-0"
            style={{ backgroundColor: session.group.color }}
          />

          {/* تفاصيل الحصة */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate text-start">
              {session.group.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-start">
              {formatTimeRange12Hour(session.group.timeStart, session.group.timeEnd)}
            </p>
          </div>

          {/* عداد الحضور + الحالة */}
          <div className="text-end shrink-0">
            <span className="text-lg font-bold">
              {presentCount}
              {totalStudents != null && (
                <span className="text-sm font-normal text-slate-500">
                  /{totalStudents}
                </span>
              )}
            </span>
            <div className="mt-1">
              <Badge variant={isCompleted ? 'success' : 'neutral'}>
                {isCompleted ? '✅ مكتملة' : '🕐 مجدولة'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
