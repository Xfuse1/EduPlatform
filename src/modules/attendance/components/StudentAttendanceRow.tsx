'use client'

// ── B-02: StudentAttendanceRow ───────────────────────────────────────────────

interface StudentAttendanceRowProps {
  student: {
    id: string
    name: string
    paymentStatus: string
  }
  status: 'PRESENT' | 'ABSENT'
  onToggle: () => void
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/**
 * صف طالب واحد في شيت الحضور — toggle بين حاضر وغائب
 */
export function StudentAttendanceRow({
  student,
  status,
  onToggle,
}: StudentAttendanceRowProps) {
  const isPresent = status === 'PRESENT'

  const paymentIcon =
    student.paymentStatus === 'PAID'
      ? '🟢'
      : student.paymentStatus === 'PARTIAL'
        ? '🟡'
        : '🔴'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={joinClasses(
        'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all min-h-[56px] text-start',
        isPresent
          ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-700'
          : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {isPresent ? '✅' : '❌'}
        </span>
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {student.name}
        </span>
      </div>
      <span
        className="text-lg"
        title={`حالة الدفع: ${student.paymentStatus}`}
      >
        {paymentIcon}
      </span>
    </button>
  )
}
