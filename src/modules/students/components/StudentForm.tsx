'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState, useTransition } from 'react'

import Badge from '@/components/data-display/Badge'
import FormField from '@/components/forms/FormField'
import {
  createStudent,
  enrollInGroup,
  updateStudent,
} from '@/modules/students/actions'
import {
  studentCreateSchema,
  type StudentCreateInput,
} from '@/modules/students/validations'

type AvailableGroup = {
  id: string
  name: string
  subject: string
  gradeLevel: string
  studentCount: number
  maxCapacity: number
}

type StudentFormProps = {
  mode?: 'create' | 'edit'
  studentId?: string
  availableGroups: AvailableGroup[]
  defaultValues?: {
    name?: string
    phone?: string | null
    parentName?: string | null
    parentPhone?: string | null
    gradeLevel?: string | null
  }
  initialGroupIds?: string[]
  showGroupSelector?: boolean
  onSuccess?: () => void | Promise<void>
}

type FieldErrorState = Partial<Record<keyof StudentCreateInput | 'form', string>>

const generatedPhonePrefix = '__student_without_phone__'

const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60'

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function buildFieldErrors(
  validationError: Exclude<
    ReturnType<typeof studentCreateSchema.safeParse>,
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

function getVisiblePhone(phone?: string | null) {
  if (!phone || phone.startsWith(generatedPhonePrefix)) {
    return ''
  }

  return phone
}

export default function StudentForm({
  mode = 'create',
  studentId,
  availableGroups,
  defaultValues,
  initialGroupIds = [],
  showGroupSelector = true,
  onSuccess,
}: StudentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    showGroupSelector ? initialGroupIds : [],
  )
  const [errors, setErrors] = useState<FieldErrorState>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((currentValue) => {
      if (currentValue.includes(groupId)) {
        return currentValue.filter((id) => id !== groupId)
      }

      return [...currentValue, groupId]
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const primaryGroupId = showGroupSelector ? selectedGroupIds[0] : undefined

    if (primaryGroupId) {
      formData.set('groupId', primaryGroupId)
    } else {
      formData.delete('groupId')
    }

    const validationResult = studentCreateSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      groupId: primaryGroupId,
    })

    if (!validationResult.success) {
      setErrors(buildFieldErrors(validationResult))
      setSubmitError(null)
      return
    }

    setErrors({})
    setSubmitError(null)

    startTransition(() => {
      void (async () => {
        try {
          if (mode === 'create') {
            const result = await createStudent(formData)
            const extraGroupIds = showGroupSelector
              ? selectedGroupIds.slice(1)
              : []

            if (extraGroupIds.length > 0) {
              await Promise.all(
                extraGroupIds.map((groupId) =>
                  enrollInGroup(result.student.id, groupId),
                ),
              )
            }
          } else {
            if (!studentId) {
              throw new Error('معرف الطالب مطلوب للتعديل')
            }

            await updateStudent(studentId, formData)
          }

          router.refresh()

          if (onSuccess) {
            await onSuccess()
          }
        } catch (error) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : 'تعذر حفظ بيانات الطالب الآن',
          )
        }
      })()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="اسم الطالب" htmlFor="name" required error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={defaultValues?.name ?? ''}
            className={inputClassName}
            aria-invalid={Boolean(errors.name)}
          />
        </FormField>

        <FormField label="هاتف الطالب" htmlFor="phone" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={getVisiblePhone(defaultValues?.phone)}
            placeholder="اختياري"
            className={inputClassName}
            aria-invalid={Boolean(errors.phone)}
          />
        </FormField>

        <FormField
          label="اسم ولي الأمر"
          htmlFor="parentName"
          required
          error={errors.parentName}
        >
          <input
            id="parentName"
            name="parentName"
            type="text"
            defaultValue={defaultValues?.parentName ?? ''}
            className={inputClassName}
            aria-invalid={Boolean(errors.parentName)}
          />
        </FormField>

        <FormField
          label="هاتف ولي الأمر"
          htmlFor="parentPhone"
          required
          error={errors.parentPhone}
        >
          <input
            id="parentPhone"
            name="parentPhone"
            type="tel"
            defaultValue={defaultValues?.parentPhone ?? ''}
            className={inputClassName}
            aria-invalid={Boolean(errors.parentPhone)}
          />
        </FormField>

        <FormField
          label="الصف الدراسي"
          htmlFor="gradeLevel"
          required
          error={errors.gradeLevel}
          className="md:col-span-2"
        >
          <input
            id="gradeLevel"
            name="gradeLevel"
            type="text"
            defaultValue={defaultValues?.gradeLevel ?? ''}
            className={inputClassName}
            aria-invalid={Boolean(errors.gradeLevel)}
          />
        </FormField>
      </div>

      {showGroupSelector ? (
        <FormField
          label="المجموعات"
          hint="يمكن اختيار أكثر من مجموعة. أول اختيار يُرسل مع الإنشاء، والباقي يُضاف بعد الحفظ."
        >
          <div className="flex flex-wrap gap-2">
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
                  <span className="mt-2 block text-xs opacity-75">
                    {group.studentCount} / {group.maxCapacity}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedGroupIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedGroupIds.map((groupId) => {
                const group = availableGroups.find((item) => item.id === groupId)

                if (!group) {
                  return null
                }

                return (
                  <Badge key={group.id} variant="primary">
                    {group.name}
                  </Badge>
                )
              })}
            </div>
          ) : null}
        </FormField>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {submitError}
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={joinClasses(
            'inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500',
            isPending && 'cursor-not-allowed opacity-70',
          )}
        >
          {isPending
            ? mode === 'create'
              ? 'جارٍ إضافة الطالب...'
              : 'جارٍ حفظ التعديلات...'
            : mode === 'create'
              ? 'حفظ الطالب'
              : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  )
}
