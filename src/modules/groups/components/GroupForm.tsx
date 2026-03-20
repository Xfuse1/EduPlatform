'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState, useTransition } from 'react'

import ColorPicker from '@/components/forms/ColorPicker'
import DaysPicker from '@/components/forms/DaysPicker'
import FormField from '@/components/forms/FormField'
import { ROUTES } from '@/config/routes'
import { createGroup, updateGroup } from '@/modules/groups/actions'
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

type FieldErrorState = Partial<Record<keyof GroupCreateInput | 'form', string>>

const defaultValues: GroupCreateInput = {
  name: '',
  subject: '',
  gradeLevel: '',
  days: [],
  timeStart: '',
  timeEnd: '',
  room: undefined,
  maxCapacity: 40,
  monthlyFee: 0,
  color: '#2E86C1',
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function buildFieldErrors(
  validationError: Exclude<
    ReturnType<typeof groupCreateSchema.safeParse>,
    { success: true }
  >,
) {
  const flattenedErrors = validationError.error.flatten().fieldErrors

  return Object.fromEntries(
    Object.entries(flattenedErrors)
      .map(([key, value]) => [key, value?.[0]])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  ) as FieldErrorState
}

const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60'

export default function GroupForm({
  mode = 'create',
  groupId,
  initialValues = defaultValues,
  redirectTo = ROUTES.teacher.groups,
}: GroupFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [days, setDays] = useState(initialValues.days)
  const [color, setColor] = useState(initialValues.color)
  const [errors, setErrors] = useState<FieldErrorState>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const validationResult = groupCreateSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      days,
      color,
    })

    if (!validationResult.success) {
      setErrors(buildFieldErrors(validationResult))
      setSubmitError(null)
      return
    }

    formData.delete('days')
    formData.set('color', color)
    for (const day of days) {
      formData.append('days', day)
    }

    setErrors({})
    setSubmitError(null)

    startTransition(() => {
      void (async () => {
        try {
          if (mode === 'edit') {
            if (!groupId) {
              throw new Error('معرف المجموعة مطلوب للتعديل')
            }

            await updateGroup(groupId, formData)
          } else {
            await createGroup(formData)
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
          أدخل تفاصيل المجموعة كما ستظهر في لوحة المعلم والحضور والمصاريف.
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
          label="الصف الدراسي"
          htmlFor="gradeLevel"
          required
          error={errors.gradeLevel}
        >
          <input
            id="gradeLevel"
            name="gradeLevel"
            type="text"
            defaultValue={initialValues.gradeLevel}
            placeholder="مثال: الصف الثالث الثانوي"
            className={inputClassName}
            aria-invalid={Boolean(errors.gradeLevel)}
          />
        </FormField>

        <FormField label="القاعة" htmlFor="room" error={errors.room}>
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
          label="وقت البداية"
          htmlFor="timeStart"
          required
          error={errors.timeStart}
        >
          <input
            id="timeStart"
            name="timeStart"
            type="time"
            defaultValue={initialValues.timeStart}
            className={inputClassName}
            aria-invalid={Boolean(errors.timeStart)}
          />
        </FormField>

        <FormField
          label="وقت النهاية"
          htmlFor="timeEnd"
          required
          error={errors.timeEnd}
        >
          <input
            id="timeEnd"
            name="timeEnd"
            type="time"
            defaultValue={initialValues.timeEnd}
            className={inputClassName}
            aria-invalid={Boolean(errors.timeEnd)}
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

        <FormField
          label="المصاريف الشهرية"
          htmlFor="monthlyFee"
          required
          error={errors.monthlyFee}
          hint="اكتب المبلغ بالجنيه المصري"
        >
          <input
            id="monthlyFee"
            name="monthlyFee"
            type="number"
            min={0}
            defaultValue={String(initialValues.monthlyFee)}
            className={inputClassName}
            aria-invalid={Boolean(errors.monthlyFee)}
          />
        </FormField>
      </div>

      <FormField
        label="أيام الدراسة"
        required
        error={errors.days}
        hint="يمكن اختيار أكثر من يوم"
      >
        <DaysPicker value={days} onChange={setDays} disabled={isPending} />
      </FormField>

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
              : 'حفظ المجموعة'}
        </button>
      </div>
    </form>
  )
}
