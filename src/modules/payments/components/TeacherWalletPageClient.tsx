'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { requestTeacherWalletWithdrawal } from '@/modules/payments/actions'
import { toWhatsAppUrl } from '@/lib/phone'

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  SUCCESS: 'تم بنجاح',
  FAILED: 'فشل',
  CANCELLED: 'ملغي',
}

const FAILURE_REASON_LABELS: Record<string, string> = {
  KASHIER_TRANSFER_API_PENDING_INTEGRATION: 'ميزة السحب المباشر عبر Kashier قيد التطوير وستتاح قريبًا',
  KASHIER_TRANSFER_API_ERROR: 'خطأ في الاتصال بـ Kashier',
  KASHIER_TRANSFER_FAILED: 'فشل تحويل Kashier',
  PAYOUT_WALLET_DEBIT_FAILED: 'فشل خصم الرصيد من المحفظة',
}

function formatFailureReason(reason: string | null | undefined) {
  if (!reason) return null
  return FAILURE_REASON_LABELS[reason] ?? reason
}

type TeacherWalletData = Awaited<ReturnType<typeof import('@/modules/payments/queries').getTeacherWalletPageData>>

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-EG')} ج.م`
}

function formatDate(value: Date | string | null) {
  if (!value) return 'لم يتم'
  return new Date(value).toLocaleString('ar-EG')
}

export function TeacherWalletPageClient({ data }: { data: TeacherWalletData }) {
  const [amount, setAmount] = useState(String(data.wallet.balance > 0 ? data.wallet.balance : ''))
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const adminContactUrl = useMemo(() => {
    if (!data.adminContact?.phone) return null
    return toWhatsAppUrl(data.adminContact.phone)
  }, [data.adminContact?.phone])

  function handleWithdraw() {
    const numericAmount = Number(amount)
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'أدخل مبلغ سحب صحيح' })
      return
    }

    setMessage(null)
    startTransition(async () => {
      const result = await requestTeacherWalletWithdrawal({ amount: numericAmount })
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message ?? (result.success ? 'تم تنفيذ السحب' : 'تعذر تنفيذ السحب'),
      })
    })
  }

  return (
    <div className="space-y-6 p-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">محفظة المعلم</h1>
        <p className="text-sm text-slate-500">رصيد المدفوعات التي تم تحصيلها لحسابك بعد خصم رسوم المنصة.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-slate-500">الرصيد الحالي</p>
            <p className="text-3xl font-extrabold text-primary">{formatCurrency(data.wallet.balance)}</p>
            <p className="text-xs text-slate-500">آخر تحديث: {formatDate(data.wallet.updatedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-slate-500">إجمالي الداخل</p>
            <p className="text-2xl font-extrabold text-emerald-600">{formatCurrency(data.totals.received)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-slate-500">إجمالي السحوبات</p>
            <p className="text-2xl font-extrabold text-sky-600">{formatCurrency(data.totals.withdrawn)}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold">سحب الرصيد</h2>
              <p className="text-sm text-slate-500">السحب لا يتم تلقائيًا. اختر طريقة السحب عند الحاجة.</p>
            </div>
            <Link className="text-sm font-bold text-sky-600 hover:underline" href="/teacher/settings">
              إعدادات Kashier
            </Link>
          </div>

          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
            ميزة السحب المباشر عبر Kashier قيد التطوير وستتاح قريبًا. للسحب الآن تواصل مع الإدارة.
          </p>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="مبلغ السحب"
              disabled
            />
            <Button type="button" onClick={handleWithdraw} disabled>
              سحب عبر Kashier
            </Button>
            {adminContactUrl ? (
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                href={adminContactUrl}
                target="_blank"
                rel="noreferrer"
              >
                تواصل مع الإدارة
              </a>
            ) : (
              <Button type="button" variant="outline" disabled>
                لا يوجد رقم إدارة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-bold">آخر معاملات المحفظة</h2>
            {data.transactions.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد معاملات بعد.</p>
            ) : (
              data.transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{transaction.reason}</p>
                    <p className={transaction.type === 'PAYOUT' || transaction.type === 'DEBIT' ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{transaction.type} | {formatDate(transaction.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-bold">طلبات السحب</h2>
            {data.withdrawals.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد طلبات سحب بعد.</p>
            ) : (
              data.withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{formatCurrency(withdrawal.amount)}</p>
                    <p className={`font-bold ${withdrawal.status === 'FAILED' ? 'text-rose-600' : withdrawal.status === 'SUCCESS' ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {WITHDRAWAL_STATUS_LABELS[withdrawal.status] ?? withdrawal.status}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {withdrawal.method}{withdrawal.adminMethod ? ` / ${withdrawal.adminMethod}` : ''} | {formatDate(withdrawal.requestedAt)}
                  </p>
                  {withdrawal.failureReason ? <p className="mt-1 text-xs text-rose-600">{formatFailureReason(withdrawal.failureReason)}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
