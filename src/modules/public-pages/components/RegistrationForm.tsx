'use client'

import type { FormEvent } from 'react'
import { useState, useTransition } from 'react'

import { ROUTES } from '@/config/routes'
import GroupSelector from '@/modules/public-pages/components/GroupSelector'
import { publicRegistrationSchema } from '@/modules/public-pages/validations'

type RegistrationFormProps = {
  groups: Array<{
    id: string
    name: string
    subject: string
    gradeLevel: string
    timeStart: string
    timeEnd: string
    studentCount: number
    maxCapacity: number
    color: string
  }>
}

const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60'

export default function RegistrationForm({ groups }: RegistrationFormProps) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      ...Object.fromEntries(formData.entries()),
      groupId,
    }

    const validationResult = publicRegistrationSchema.safeParse(payload)

    if (!validationResult.success) {
      setError(validationResult.error.issues[0]?.message ?? 'بيانات غير صحيحة')
      return
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(ROUTES.api.public.register, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify(validationResult.data),
          })

          const result = (await response.json()) as {
            data?: {
              enrollmentStatus: 'ACTIVE' | 'WAITLIST'
            }
            error?: {
              message: string
            }
          }

          if (!response.ok || !result.data) {
            throw new Error(result.error?.message || 'تعذر إرسال الطلب')
          }

          setSuccessMessage(
            result.data.enrollmentStatus === 'WAITLIST'
              ? 'تم تسجيل الطلب وإضافة الطالب إلى قائمة الانتظار.'
              : 'تم تسجيل الطالب بنجاح في المجموعة.',
          )
          form.reset()
          setGroupId(groups[0]?.id ?? '')
        } catch (submitError) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : 'تعذر إرسال الطلب',
          )
        }
      })()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <input
          name="name"
          placeholder="اسم الطالب"
          className={inputClassName}
        />
        <input
          name="phone"
          type="tel"
          placeholder="+201012345678"
          className={inputClassName}
        />
        <input
          name="parentName"
          placeholder="اسم ولي الأمر"
          className={inputClassName}
        />
        <input
          name="parentPhone"
          type="tel"
          placeholder="+201012345678"
          className={inputClassName}
        />
        <input
          name="gradeLevel"
          placeholder="الصف الدراسي"
          className="md:col-span-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          اختر المجموعة
        </h2>
        <GroupSelector groups={groups} value={groupId} onChange={setGroupId} />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || groups.length === 0}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
      >
        {isPending ? 'جارٍ إرسال الطلب...' : 'تسجيل الطالب'}
      </button>
    </form>
  )
}
