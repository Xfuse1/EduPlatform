'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useTenant } from '@/components/shared/TenantProvider'
import { ROUTES } from '@/config/routes'
import OTPInput from '@/modules/auth/components/OTPInput'

export default function VerifyPage() {
  const tenant = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleVerify() {
    setError(null)

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(ROUTES.api.auth.verifyOtp, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({ phone, code }),
          })

          const payload = (await response.json()) as {
            data?: {
              redirectTo: string
            }
            error?: {
              message: string
            }
          }

          if (!response.ok || !payload.data) {
            throw new Error(payload.error?.message || 'تعذر التحقق من الرمز')
          }

          router.push(payload.data.redirectTo)
          router.refresh()
        } catch (verifyError) {
          setError(
            verifyError instanceof Error
              ? verifyError.message
              : 'تعذر التحقق من الرمز',
          )
        }
      })()
    })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-16">
      <section className="w-full rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-8">
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
          التحقق من الهوية
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
          {tenant.name}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
          أدخل الرمز المرسل إلى الرقم{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {phone || 'غير محدد'}
          </span>
          .
        </p>

        <div className="mt-6 space-y-5">
          <OTPInput value={code} onChange={setCode} disabled={isPending} />

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleVerify}
            disabled={isPending || phone.length === 0 || code.length !== 6}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
          >
            {isPending ? 'جارٍ التحقق...' : 'تأكيد الرمز'}
          </button>

          <Link
            href={ROUTES.auth.login}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            الرجوع إلى تسجيل الدخول
          </Link>
        </div>
      </section>
    </main>
  )
}
