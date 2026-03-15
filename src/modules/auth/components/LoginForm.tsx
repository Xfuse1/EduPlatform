'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState, useTransition } from 'react'

import { ROUTES } from '@/config/routes'

type LoginFormProps = {
  tenantName: string
}

export default function LoginForm({ tenantName }: LoginFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [debugCode, setDebugCode] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setDebugCode(null)

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(ROUTES.api.auth.sendOtp, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({ phone }),
          })

          const payload = (await response.json()) as {
            data?: {
              phone: string
              debugCode?: string
            }
            error?: {
              message: string
            }
          }

          if (!response.ok || !payload.data) {
            throw new Error(payload.error?.message || 'تعذر إرسال رمز التحقق')
          }

          setDebugCode(payload.data.debugCode ?? null)
          router.push(`${ROUTES.auth.verify}?phone=${encodeURIComponent(payload.data.phone)}`)
          router.refresh()
        } catch (submitError) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : 'تعذر إرسال رمز التحقق',
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
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
          تسجيل الدخول إلى {tenantName}
        </h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          أدخل رقم الهاتف بصيغة <span className="font-semibold">+2010XXXXXXX</span>{' '}
          لإرسال رمز التحقق.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="login-phone"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          رقم الهاتف
        </label>
        <input
          id="login-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
          placeholder="+201012345678"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {debugCode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          رمز التحقق التجريبي: {debugCode}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
      >
        {isPending ? 'جارٍ إرسال الرمز...' : 'إرسال رمز التحقق'}
      </button>
    </form>
  )
}
