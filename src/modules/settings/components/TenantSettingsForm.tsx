'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import ColorPicker from '@/components/forms/ColorPicker'
import FormField from '@/components/forms/FormField'

import { updateTenant } from '../actions'
import {
  tenantSettingsSchema,
  type TenantSettingsInput,
} from '../validations'

type TenantSettingsFormProps = {
  tenant: {
    slug: string
    name: string
    logoUrl: string | null
    themeColor: string
    bio: string | null
    subjects: string[]
    region: string | null
  }
}

type FieldErrorState = Partial<Record<keyof TenantSettingsInput, string>>

const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60'

function buildFieldErrors(
  validationError: Exclude<
    ReturnType<typeof tenantSettingsSchema.safeParse>,
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

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function TenantSettingsForm({
  tenant,
}: TenantSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [themeColor, setThemeColor] = useState(tenant.themeColor)
  const [logoPreview, setLogoPreview] = useState(tenant.logoUrl ?? '')
  const [subjectsInput, setSubjectsInput] = useState(tenant.subjects.join('\n'))
  const [errors, setErrors] = useState<FieldErrorState>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setSubmitError('يرجى اختيار ملف صورة صالح للشعار')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoPreview(reader.result)
        setSubmitError(null)
      }
    }

    reader.readAsDataURL(file)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    formData.set('themeColor', themeColor)
    formData.set('logoUrl', logoPreview)
    formData.set('subjects', subjectsInput)

    const validationResult = tenantSettingsSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      themeColor,
      logoUrl: logoPreview,
      subjects: subjectsInput,
    })

    if (!validationResult.success) {
      setErrors(buildFieldErrors(validationResult))
      setSubmitError(null)
      setSubmitSuccess(null)
      return
    }

    setErrors({})
    setSubmitError(null)
    setSubmitSuccess(null)

    startTransition(() => {
      void (async () => {
        try {
          await updateTenant(formData)
          setSubmitSuccess('تم حفظ الإعدادات بنجاح')
          router.refresh()
        } catch (error) {
          setSubmitError(
            error instanceof Error ? error.message : 'تعذر حفظ الإعدادات الآن',
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField
          label="السب دومين"
          htmlFor="subdomain"
          hint="يظهر للقراءة فقط"
        >
          <input
            id="subdomain"
            value={tenant.slug}
            readOnly
            className={joinClasses(inputClassName, 'bg-slate-50 dark:bg-slate-900')}
          />
        </FormField>

        <FormField label="اسم المؤسسة" htmlFor="name" required error={errors.name}>
          <input
            id="name"
            name="name"
            defaultValue={tenant.name}
            className={inputClassName}
            aria-invalid={Boolean(errors.name)}
          />
        </FormField>

        <FormField label="المنطقة" htmlFor="region" error={errors.region}>
          <input
            id="region"
            name="region"
            defaultValue={tenant.region ?? ''}
            className={inputClassName}
            aria-invalid={Boolean(errors.region)}
          />
        </FormField>

        <FormField
          label="الشعار"
          htmlFor="logoFile"
          error={errors.logoUrl}
          hint="يمكنك رفع صورة وسيتم حفظها داخل الإعدادات بصيغة مناسبة للـ MVP"
        >
          <div className="space-y-3">
            <input
              id="logoFile"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="block w-full text-sm text-slate-600 dark:text-slate-300"
            />
            <input type="hidden" name="logoUrl" value={logoPreview} readOnly />

            {logoPreview ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <img
                  src={logoPreview}
                  alt="شعار المؤسسة"
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              </div>
            ) : null}
          </div>
        </FormField>
      </div>

      <FormField
        label="لون الهوية"
        required
        error={errors.themeColor}
        hint="يستخدم في أجزاء متعددة من الواجهة والصفحات العامة"
      >
        <ColorPicker
          name="themeColor"
          value={themeColor}
          onChange={setThemeColor}
          disabled={isPending}
        />
      </FormField>

      <FormField label="نبذة" htmlFor="bio" error={errors.bio}>
        <textarea
          id="bio"
          name="bio"
          defaultValue={tenant.bio ?? ''}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
        />
      </FormField>

      <FormField
        label="المواد"
        htmlFor="subjects"
        required
        error={errors.subjects}
        hint="اكتب كل مادة في سطر أو افصل بينها بفاصلة"
      >
        <textarea
          id="subjects"
          name="subjects"
          rows={5}
          value={subjectsInput}
          onChange={(event) => setSubjectsInput(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
        />
      </FormField>

      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {submitError}
        </div>
      ) : null}

      {submitSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          {submitSuccess}
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
          {isPending ? 'جارٍ حفظ الإعدادات...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </form>
  )
}
