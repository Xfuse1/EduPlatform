'use client'

import Link from 'next/link'
import { Check, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { EDUCATION_STAGE_OPTIONS, formatGradeLevel, getEducationYears, parseGradeLevel, type EducationStage } from '@/lib/grade-levels'

import ColorPicker from '@/components/forms/ColorPicker'
import FormField from '@/components/forms/FormField'
import { ROUTES } from '@/config/routes'
import { createGroup, updateGroup } from '@/modules/groups/actions'
import {
  GROUP_DAY_VALUES,
  getArabicDayLabel,
  getTimeMeridiemLabel,
  type GroupScheduleInput,
} from '@/modules/groups/schedule'
import {
  groupCreateSchema,
  type GroupCreateInput,
} from '@/modules/groups/validations'

type GroupFormProps = {
  mode?: 'create' | 'edit'
  groupId?: string
  initialValues?: GroupCreateInput
  redirectTo?: string
}

type ScheduleEntryErrors = Array<Record<string, string | undefined>>

type FieldErrorState = Partial<Record<Exclude<keyof GroupCreateInput, 'schedule'> | 'schedule' | 'form', string>>

const SESSION_LABELS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'] as const

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const hour = String(index + 1)
  return { value: hour, label: hour.padStart(2, '0') }
})

const MINUTE_OPTIONS = ['00', '15', '30', '45'].map((minute) => ({ value: minute, label: minute }))

const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
]

const DAY_OPTIONS = GROUP_DAY_VALUES.map((day) => ({
  value: day,
  label: getArabicDayLabel(day),
}))

const defaultValues: GroupCreateInput = {
  name: '',
  subject: '',
  gradeLevel: '',
  schedule: [
    {
      day: 'saturday',
      timeStart: '',
      timeEnd: '',
    },
  ],
  room: undefined,
  maxCapacity: 40,
  monthlyFee: 0,
  billingType: 'MONTHLY',
  color: '#2E86C1',
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function cloneSchedule(schedule: GroupScheduleInput[]) {
  return schedule.map((entry) => ({ ...entry }))
}

function isUsingSameTime(schedule: GroupScheduleInput[]) {
  if (schedule.length <= 1) {
    return false
  }

  const firstEntry = schedule[0]
  return schedule.slice(1).every(
    (entry) => entry.timeStart === firstEntry.timeStart && entry.timeEnd === firstEntry.timeEnd,
  )
}

function syncTimesFromFirst(entries: GroupScheduleInput[]) {
  if (entries.length <= 1) {
    return entries
  }

  const firstEntry = entries[0]

  return entries.map((entry, index) =>
    index === 0
      ? entry
      : {
          ...entry,
          timeStart: firstEntry.timeStart,
          timeEnd: firstEntry.timeEnd,
        },
  )
}

function getNextDay(entries: GroupScheduleInput[], index: number) {
  const usedDays = new Set(entries.map((entry) => entry.day))
  return GROUP_DAY_VALUES.find((day) => !usedDays.has(day)) ?? GROUP_DAY_VALUES[index % GROUP_DAY_VALUES.length]
}

function buildValidationState(invalidResult: Exclude<ReturnType<typeof groupCreateSchema.safeParse>, { success: true }>, scheduleLength: number) {
  const fieldErrors: FieldErrorState = {}
  const scheduleErrors: ScheduleEntryErrors = Array.from({ length: scheduleLength }, () => ({}))

  for (const issue of invalidResult.error.issues) {
    const [firstSegment, secondSegment, thirdSegment] = issue.path

    if (firstSegment === 'schedule') {
      if (typeof secondSegment === 'number' && typeof thirdSegment === 'string') {
        scheduleErrors[secondSegment] ??= {}
        scheduleErrors[secondSegment][thirdSegment as 'day' | 'timeStart' | 'timeEnd'] = issue.message
      } else if (!fieldErrors.schedule) {
        fieldErrors.schedule = issue.message
      }

      continue
    }

    if (typeof firstSegment === 'string' && !fieldErrors[firstSegment as keyof FieldErrorState]) {
      fieldErrors[firstSegment as keyof FieldErrorState] = issue.message
    }
  }

  return {
    fieldErrors,
    scheduleErrors,
  }
}

function getTimeHint(value: string) {
  if (!value) {
    return 'اختر الوقت بصيغة 24 ساعة'
  }

  const meridiemLabel = getTimeMeridiemLabel(value)
  return meridiemLabel ? `هذا الوقت ${meridiemLabel}` : 'أدخل وقتًا صحيحًا'
}

const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60'

type SelectOption = {
  value: string
  label: string
}

function ThemedDropdown({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ariaInvalid,
  compact = false,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  disabled?: boolean
  ariaInvalid?: boolean
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        onClick={() => setOpen((current) => !current)}
        className={joinClasses(
          inputClassName,
          'flex items-center justify-between gap-2 text-start font-bold disabled:cursor-not-allowed disabled:opacity-60',
          compact && 'px-3 text-center',
        )}
      >
        <span className={joinClasses('min-w-0 truncate', selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={joinClasses('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180 text-secondary')} />
      </button>

      {open && !disabled ? (
        <div
          role="listbox"
          className="absolute right-0 top-full z-[80] mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-secondary/25 bg-white p-2 shadow-[0_22px_60px_rgba(2,8,23,0.28)] ring-1 ring-secondary/10 dark:bg-slate-950"
        >
          {options.map((option) => {
            const active = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={joinClasses(
                  'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-sm font-bold transition',
                  active
                    ? 'bg-secondary text-slate-950'
                    : 'text-slate-700 hover:bg-secondary/10 hover:text-secondary dark:text-slate-200',
                )}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-4 w-4" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function parseTimeParts(value: string) {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)

  if (!match) {
    return null
  }

  const hours24 = Number(match[1])
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hour12 = hours24 % 12 || 12

  return {
    hour: String(hour12),
    minute: match[2],
    period,
  }
}

function buildTimeValue(hourValue: string, minuteValue: string, periodValue: string) {
  if (!hourValue || !minuteValue || !periodValue) {
    return ''
  }

  const hour12 = Number(hourValue)

  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12) {
    return ''
  }

  const baseHour = hour12 % 12
  const hours24 = periodValue === 'PM' ? baseHour + 12 : baseHour

  return `${String(hours24).padStart(2, '0')}:${minuteValue}`
}

function Time12Picker({
  id,
  value,
  onChange,
  disabled,
  ariaInvalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaInvalid?: boolean
}) {
  const parsedTime = useMemo(() => parseTimeParts(value), [value])
  const hour = parsedTime?.hour ?? ''
  const minute = parsedTime?.minute ?? ''
  const period = parsedTime?.period ?? ''

  function updatePart(nextPart: Partial<{ hour: string; minute: string; period: string }>) {
    const nextHour = (nextPart.hour ?? hour) || '12'
    const nextMinute = (nextPart.minute ?? minute) || '00'
    const nextPeriod = (nextPart.period ?? period) || 'PM'

    onChange(buildTimeValue(nextHour, nextMinute, nextPeriod))
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2" dir="ltr">
      <ThemedDropdown
        id={`${id}-hour`}
        value={hour}
        onChange={(nextHour) => updatePart({ hour: nextHour })}
        options={HOUR_OPTIONS}
        placeholder="HH"
        disabled={disabled}
        ariaInvalid={ariaInvalid}
        compact
      />
      <ThemedDropdown
        id={`${id}-minute`}
        value={minute}
        onChange={(nextMinute) => updatePart({ minute: nextMinute })}
        options={MINUTE_OPTIONS}
        placeholder="MM"
        disabled={disabled}
        ariaInvalid={ariaInvalid}
        compact
      />
      <ThemedDropdown
        id={`${id}-period`}
        value={period}
        onChange={(nextPeriod) => updatePart({ period: nextPeriod })}
        options={PERIOD_OPTIONS}
        placeholder="PM"
        disabled={disabled}
        ariaInvalid={ariaInvalid}
        compact
      />
    </div>
  )
}

function getInitialGradeLevelState(gradeLevel: string) {
  const parsedGradeLevel = parseGradeLevel(gradeLevel)

  return {
    stage: parsedGradeLevel.stage ?? '',
    year: parsedGradeLevel.year ? String(parsedGradeLevel.year) : '',
  }
}

export default function GroupForm({
  mode = 'create',
  groupId,
  initialValues = defaultValues,
  redirectTo = ROUTES.teacher.groups,
}: GroupFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initialSchedule = initialValues.schedule.length > 0 ? cloneSchedule(initialValues.schedule) : cloneSchedule(defaultValues.schedule)
  const initialGradeLevelState = getInitialGradeLevelState(initialValues.gradeLevel)
  const [scheduleEntries, setScheduleEntries] = useState<GroupScheduleInput[]>(initialSchedule)
  const [sameTimeForAll, setSameTimeForAll] = useState(isUsingSameTime(initialSchedule))
  const [color, setColor] = useState(initialValues.color)
  const [errors, setErrors] = useState<FieldErrorState>({})
  const [scheduleErrors, setScheduleErrors] = useState<ScheduleEntryErrors>(
    Array.from({ length: initialSchedule.length }, () => ({})),
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [feeType, setFeeType] = useState<'MONTHLY' | 'PER_SESSION' | 'FULL_COURSE'>(initialValues.billingType ?? 'MONTHLY')
  const [monthlyFeeValue, setMonthlyFeeValue] = useState(mode === 'edit' ? String(initialValues.monthlyFee) : '')
  const [educationStage, setEducationStage] = useState<EducationStage | ''>((initialGradeLevelState.stage as EducationStage | '') || '')
  const [gradeYear, setGradeYear] = useState(initialGradeLevelState.year)
  const gradeYearOptions = educationStage ? getEducationYears(educationStage) : []
  const gradeLevelValue = educationStage && gradeYear ? formatGradeLevel(educationStage, Number(gradeYear)) : ''

  function resizeSchedule(nextCount: number) {
    setScheduleEntries((currentEntries) => {
      let nextEntries = cloneSchedule(currentEntries)

      if (nextCount > nextEntries.length) {
        for (let index = nextEntries.length; index < nextCount; index += 1) {
          nextEntries.push({
            day: getNextDay(nextEntries, index),
            timeStart: sameTimeForAll ? nextEntries[0]?.timeStart ?? '' : '',
            timeEnd: sameTimeForAll ? nextEntries[0]?.timeEnd ?? '' : '',
          })
        }
      } else {
        nextEntries = nextEntries.slice(0, nextCount)
      }

      return sameTimeForAll ? syncTimesFromFirst(nextEntries) : nextEntries
    })

    setScheduleErrors(Array.from({ length: nextCount }, () => ({})))
  }

  function updateScheduleEntry(index: number, field: keyof GroupScheduleInput, value: string) {
    setScheduleEntries((currentEntries) => {
      let nextEntries = currentEntries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [field]: value,
            }
          : entry,
      )

      if (sameTimeForAll && index === 0 && (field === 'timeStart' || field === 'timeEnd')) {
        nextEntries = syncTimesFromFirst(nextEntries)
      }

      return nextEntries
    })

    setScheduleErrors((currentErrors) => {
      const nextErrors: ScheduleEntryErrors = currentErrors.length > 0
        ? currentErrors.map((entry) => ({ ...entry }))
        : Array.from({ length: scheduleEntries.length }, () => ({}))

      if (!nextErrors[index]) {
        nextErrors[index] = {}
      }

      nextErrors[index][field] = undefined
      return nextErrors
    })
  }

  function clearGradeLevelError() {
    setErrors((currentErrors) => ({
      ...currentErrors,
      gradeLevel: undefined,
    }))
    setSubmitError(null)
  }

  function handleEducationStageChange(value: string) {
    const nextStage = value as EducationStage | ''
    clearGradeLevelError()
    setEducationStage(nextStage)

    if (!nextStage) {
      setGradeYear('')
      return
    }

    setGradeYear((currentYear) => {
      const hasCurrentYear = getEducationYears(nextStage).some((yearOption) => String(yearOption.value) === currentYear)
      return hasCurrentYear ? currentYear : ''
    })
  }

  function handleGradeYearChange(value: string) {
    clearGradeLevelError()
    setGradeYear(value)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      ...Object.fromEntries(formData.entries()),
      color,
      schedule: scheduleEntries,
    }
    const validationResult = groupCreateSchema.safeParse(payload)

    if (!validationResult.success) {
      const validationState = buildValidationState(validationResult, scheduleEntries.length)
      setErrors(validationState.fieldErrors)
      setScheduleErrors(validationState.scheduleErrors)
      setSubmitError(null)
      return
    }

    formData.set('color', color)
    formData.set('schedule', JSON.stringify(scheduleEntries))

    setErrors({})
    setScheduleErrors(Array.from({ length: scheduleEntries.length }, () => ({})))
    setSubmitError(null)

    startTransition(() => {
      void (async () => {
        try {
          const result = mode === 'edit'
            ? await updateGroup(groupId ?? '', formData)
            : await createGroup(formData)

          if (!result.success) {
            setSubmitError(result.message ?? 'تعذر حفظ المجموعة الآن')
            return
          }

          router.push(redirectTo)
          router.refresh()
        } catch (error) {
          setSubmitError(
            error instanceof Error ? error.message : 'تعذر حفظ المجموعة الآن',
          )
        }
      })()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-8"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          {mode === 'edit' ? 'تعديل بيانات المجموعة' : 'بيانات المجموعة'}
        </h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          أدخل بيانات المجموعة الأساسية، ثم أضف الحصص الأسبوعية بمواعيدها الفعلية كما ستظهر في الجدول والحضور.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField
          label="اسم المجموعة"
          htmlFor="name"
          required
          error={errors.name}
        >
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={initialValues.name}
            placeholder="مثال: مجموعة ثالثة ثانوي A"
            className={inputClassName}
            aria-invalid={Boolean(errors.name)}
          />
        </FormField>

        <FormField
          label="المادة"
          htmlFor="subject"
          required
          error={errors.subject}
        >
          <input
            id="subject"
            name="subject"
            type="text"
            defaultValue={initialValues.subject}
            placeholder="مثال: الرياضيات"
            className={inputClassName}
            aria-invalid={Boolean(errors.subject)}
          />
        </FormField>

        <FormField
          label="المرحلة الدراسية"
          htmlFor="educationStage"
          required
          error={errors.gradeLevel}
        >
          <>
            <input id="gradeLevel" name="gradeLevel" type="hidden" value={gradeLevelValue} />
            <select
              id="educationStage"
              value={educationStage}
              onChange={(event) => handleEducationStageChange(event.target.value)}
              className={inputClassName}
              aria-invalid={Boolean(errors.gradeLevel)}
            >
              <option value="">اختر المرحلة الدراسية</option>
              {EDUCATION_STAGE_OPTIONS.map((stageOption) => (
                <option key={stageOption.value} value={stageOption.value}>
                  {stageOption.label}
                </option>
              ))}
            </select>
          </>
        </FormField>

        <FormField
          label="سنة المرحلة"
          htmlFor="gradeYear"
          required
          error={errors.gradeLevel}
        >
          <select
            id="gradeYear"
            value={gradeYear}
            onChange={(event) => handleGradeYearChange(event.target.value)}
            className={inputClassName}
            disabled={!educationStage}
            aria-invalid={Boolean(errors.gradeLevel)}
          >
            <option value="">{educationStage ? 'اختر سنة المرحلة' : 'اختر المرحلة الدراسية أولًا'}</option>
            {gradeYearOptions.map((yearOption) => (
              <option key={yearOption.value} value={String(yearOption.value)}>
                {yearOption.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="القاعة (اختياري)" htmlFor="room" error={errors.room}>
          <input
            id="room"
            name="room"
            type="text"
            defaultValue={initialValues.room ?? ''}
            placeholder="مثال: قاعة 2"
            className={inputClassName}
            aria-invalid={Boolean(errors.room)}
          />
        </FormField>

        <FormField
          label="الحد الأقصى للطلاب"
          htmlFor="maxCapacity"
          required
          error={errors.maxCapacity}
        >
          <input
            id="maxCapacity"
            name="maxCapacity"
            type="number"
            min={1}
            max={200}
            defaultValue={String(initialValues.maxCapacity)}
            className={inputClassName}
            aria-invalid={Boolean(errors.maxCapacity)}
          />
        </FormField>

        <div className="space-y-4 md:col-span-2">
          {/* اختيار نوع الحساب */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFeeType('MONTHLY')}
              className={joinClasses(
                'flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors',
                feeType === 'MONTHLY'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950',
              )}
            >
              📅 الحساب بالشهر
            </button>
            <button
              type="button"
              onClick={() => setFeeType('PER_SESSION')}
              className={joinClasses(
                'flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors',
                feeType === 'PER_SESSION'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950',
              )}
            >
              📚 الحساب بالحصة
            </button>
            <button
              type="button"
              onClick={() => setFeeType('FULL_COURSE')}
              className={joinClasses(
                'hidden flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors',
                feeType === 'FULL_COURSE'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950',
              )}
            >
              💳 الحساب بدفعات
            </button>
            <button
              type="button"
              onClick={() => setFeeType('FULL_COURSE')}
              className={joinClasses(
                'flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors',
                feeType === 'FULL_COURSE'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950',
              )}
            >
              💎 دفع الكورس كامل
            </button>
          </div>

          {/* حقل إدخال المبلغ */}
          <FormField
            label={
              feeType === 'MONTHLY' ? 'المصاريف الشهرية' : 
              feeType === 'PER_SESSION' ? 'سعر الحصة' :
              'سعر الكورس بالكامل'
            }
            htmlFor="monthlyFee"
            required
            error={errors.monthlyFee}
            hint={
              feeType === 'MONTHLY' ? 'اكتب المبلغ الشهري بالجنيه المصري' : 
              feeType === 'PER_SESSION' ? 'اكتب سعر الحصة الواحدة بالجنيه المصري' :
              'اكتب السعر الإجمالي للدورة/الكورس'
            }
          >
            <input name="billingType" type="hidden" value={feeType} />
            <input
              id="monthlyFee"
              name="monthlyFee"
              type="text"
              inputMode="numeric"
              value={monthlyFeeValue}
              onChange={(e) => setMonthlyFeeValue(e.target.value.replace(/\D/g, ''))}
              placeholder="مثال: 500"
              className={inputClassName}
              aria-invalid={Boolean(errors.monthlyFee)}
            />
          </FormField>
        </div>
      </div>

      <div className="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">الحصص الأسبوعية</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              أضف من 1 إلى 4 حصص. لكل حصة يوم ووقت بداية ووقت نهاية.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="عدد الحصص"
              htmlFor="sessionCount"
              required
              error={errors.schedule}
              className="min-w-[180px]"
            >
              <select
                id="sessionCount"
                name="sessionCount"
                value={String(scheduleEntries.length)}
                onChange={(event) => resizeSchedule(Number(event.target.value))}
                className={inputClassName}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </FormField>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <input
                type="checkbox"
                checked={sameTimeForAll}
                onChange={(event) => {
                  const isChecked = event.target.checked
                  setSameTimeForAll(isChecked)
                  if (isChecked) {
                    setScheduleEntries((currentEntries) => syncTimesFromFirst(cloneSchedule(currentEntries)))
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>استخدم نفس وقت البداية والنهاية لكل الحصص</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {scheduleEntries.map((entry, index) => {
            const isTimeLocked = sameTimeForAll && index > 0
            const entryErrors = scheduleErrors[index] ?? {}

            return (
              <div
                key={`schedule-entry-${index}`}
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-slate-950 dark:text-white">
                    الحصة {SESSION_LABELS[index] ?? index + 1}
                  </h4>
                  {isTimeLocked ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                      نفس وقت الحصة الأولى
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    label="اليوم"
                    htmlFor={`schedule-day-${index}`}
                    required
                    error={entryErrors.day}
                  >
                    <ThemedDropdown
                      id={`schedule-day-${index}`}
                      value={entry.day}
                      onChange={(value) => updateScheduleEntry(index, 'day', value)}
                      options={DAY_OPTIONS}
                      placeholder="اختر اليوم"
                      ariaInvalid={Boolean(entryErrors.day)}
                    />
                  </FormField>

                  <FormField
                    label="ساعة البدء"
                    htmlFor={`schedule-start-${index}`}
                    required
                    error={entryErrors.timeStart}
                    hint={isTimeLocked ? 'يتم تعبئة هذا الحقل تلقائيًا من الحصة الأولى' : getTimeHint(entry.timeStart)}
                  >
                    <Time12Picker
                      id={`schedule-start-${index}`}
                      value={entry.timeStart}
                      onChange={(value) => updateScheduleEntry(index, 'timeStart', value)}
                      disabled={isTimeLocked}
                      ariaInvalid={Boolean(entryErrors.timeStart)}
                    />
                  </FormField>

                  <FormField
                    label="ساعة الانتهاء"
                    htmlFor={`schedule-end-${index}`}
                    required
                    error={entryErrors.timeEnd}
                    hint={isTimeLocked ? 'يتم تعبئة هذا الحقل تلقائيًا من الحصة الأولى' : getTimeHint(entry.timeEnd)}
                  >
                    <Time12Picker
                      id={`schedule-end-${index}`}
                      value={entry.timeEnd}
                      onChange={(value) => updateScheduleEntry(index, 'timeEnd', value)}
                      disabled={isTimeLocked}
                      ariaInvalid={Boolean(entryErrors.timeEnd)}
                    />
                  </FormField>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <FormField
        label="لون المجموعة"
        required
        error={errors.color}
        hint="يظهر هذا اللون أعلى البطاقة وفي أجزاء من الواجهة"
      >
        <ColorPicker value={color} onChange={setColor} disabled={isPending} />
      </FormField>

      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {submitError}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={ROUTES.teacher.groups}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          العودة إلى المجموعات
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className={joinClasses(
            'inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500',
            isPending && 'cursor-not-allowed opacity-70',
          )}
        >
          {isPending
            ? mode === 'edit'
              ? 'جارٍ حفظ التعديلات...'
              : 'جارٍ إنشاء المجموعة...'
            : mode === 'edit'
              ? 'حفظ التعديلات'
              : 'إضافة المجموعة'}
        </button>
      </div>
    </form>
  )
}
