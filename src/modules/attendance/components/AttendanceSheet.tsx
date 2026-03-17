'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StudentAttendanceRow } from './StudentAttendanceRow'
import { markAttendance } from '@/modules/attendance/actions'

// ── B-02: AttendanceSheet ────────────────────────────────────────────────────

interface Student {
  id: string
  name: string
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
}

interface AttendanceSheetProps {
  sessionId: string
  students: Student[]
}

/**
 * شيت تسجيل الحضور الكامل مع زر حفظ ثابت في الأسفل
 */
export function AttendanceSheet({ sessionId, students }: AttendanceSheetProps) {
  const [statuses, setStatuses] = useState<
    Record<string, 'PRESENT' | 'ABSENT'>
  >(
    Object.fromEntries(
      students.map((s) => [
        s.id,
        s.attendanceStatus === 'PRESENT' ? 'PRESENT' : 'ABSENT',
      ]),
    ),
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const presentCount = Object.values(statuses).filter(
    (s) => s === 'PRESENT',
  ).length

  const toggle = (studentId: string) => {
    setStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }))
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      try {
        const records = Object.entries(statuses).map(([studentId, status]) => ({
          studentId,
          status,
        }))
        await markAttendance(sessionId, records)
        router.push('/attendance')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ')
      }
    })
  }

  return (
    <>
      {/* عداد الحضور */}
      <div className="flex justify-between items-center mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          الحضور:
        </span>
        <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
          {presentCount} / {students.length}
        </span>
      </div>

      {/* رسالة خطأ */}
      {error && (
        <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* قائمة الطلاب */}
      <div className="space-y-2 pb-24">
        {students.map((student) => (
          <StudentAttendanceRow
            key={student.id}
            student={student}
            status={statuses[student.id] ?? 'ABSENT'}
            onToggle={() => toggle(student.id)}
          />
        ))}
      </div>

      {/* زر الحفظ الثابت */}
      <div className="fixed bottom-0 start-0 end-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full h-14 text-lg font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white transition-colors"
        >
          {isPending ? '⏳ جاري الحفظ...' : 'حفظ الحضور ✅'}
        </button>
      </div>
    </>
  )
}
