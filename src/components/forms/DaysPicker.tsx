'use client'

import type { DayOfWeek } from '@/types'

import { GROUP_DAY_VALUES } from '@/modules/groups/validations'

type DaysPickerProps = {
  name?: string
  value: DayOfWeek[]
  onChange: (value: DayOfWeek[]) => void
  disabled?: boolean
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function DaysPicker({
  name = 'days',
  value,
  onChange,
  disabled = false,
}: DaysPickerProps) {
  function toggleDay(day: DayOfWeek) {
    if (disabled) {
      return
    }

    if (value.includes(day)) {
      onChange(value.filter((currentDay) => currentDay !== day))
      return
    }

    onChange([...value, day])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {GROUP_DAY_VALUES.map((day) => {
          const active = value.includes(day)

          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              disabled={disabled}
              aria-pressed={active}
              className={joinClasses(
                'rounded-2xl border px-4 py-2 text-sm font-medium transition-colors',
                disabled && 'cursor-not-allowed opacity-60',
                active
                  ? 'border-sky-600 bg-sky-600 text-white shadow-sm dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:text-sky-200',
              )}
            >
              {DAY_LABELS[day]}
            </button>
          )
        })}
      </div>

      {value.map((day) => (
        <input key={day} type="hidden" name={name} value={day} />
      ))}
    </div>
  )
}
