'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Download, MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toWhatsAppUrl } from '@/lib/phone'

type WalletRole = 'STUDENT' | 'PARENT'

type ParentChild = {
  id: string
  name: string
}

type WalletResponse = {
  owner: 'STUDENT' | 'PARENT'
  ownerId: string
  balance: number
  updatedAt: string | null
}

type WalletTransaction = {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'ADMIN_ADJUSTMENT' | 'PAYOUT'
  typeLabel: string
  direction: 'CREDIT' | 'DEBIT' | 'PAYOUT'
  amount: number
  signedAmount: number
  reason: string
  status: string
  statusLabel: string
  createdAt: string
  payment: {
    month: string
    method: string
    receiptNumber: string | null
  } | null
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-EG')} ج.م`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function WalletPageClient({
  role,
  userId,
  children = [],
  adminContact,
}: {
  role: WalletRole
  userId: string
  children?: ParentChild[]
  adminContact?: string | null
}) {
  const [selectedWalletTargetId, setSelectedWalletTargetId] = useState(children[0]?.id ?? '')
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('شحن المحفظة')
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const balanceQueryTarget = useMemo(() => {
    if (role === 'PARENT') return selectedWalletTargetId
    return userId
  }, [role, selectedWalletTargetId, userId])

  const rechargeTarget = role === 'PARENT' ? selectedWalletTargetId : userId
  const adminContactUrl = adminContact ? toWhatsAppUrl(adminContact) : null

  useEffect(() => {
    if (!balanceQueryTarget) return

    let active = true
    setIsLoading(true)
    setError(null)

    const url = role === 'PARENT'
      ? `/api/payments/balance?studentId=${encodeURIComponent(balanceQueryTarget)}`
      : '/api/payments/balance'

    fetch(url)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message ?? 'تعذر تحميل بيانات المحفظة')
        return data
      })
      .then((payload) => {
        if (!active) return
        setWallet(payload.data as WalletResponse)
      })
      .catch((e) => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات المحفظة')
      })
      .finally(() => {
        if (!active) return
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [balanceQueryTarget, role])

  useEffect(() => {
    if (!balanceQueryTarget) {
      setTransactions([])
      return
    }

    let active = true
    setIsTransactionsLoading(true)
    setTransactionsError(null)

    fetch(`/api/payments/wallet-transactions?studentId=${encodeURIComponent(balanceQueryTarget)}&limit=20`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error?.message ?? data?.message ?? 'تعذر تحميل عمليات المحفظة')
        return data
      })
      .then((payload) => {
        if (!active) return
        setTransactions(payload.data?.transactions ?? [])
      })
      .catch((e) => {
        if (!active) return
        setTransactionsError(e instanceof Error ? e.message : 'تعذر تحميل عمليات المحفظة')
        setTransactions([])
      })
      .finally(() => {
        if (!active) return
        setIsTransactionsLoading(false)
      })

    return () => {
      active = false
    }
  }, [balanceQueryTarget])

  function handleDownloadTransactions() {
    if (!balanceQueryTarget) return

    const params = new URLSearchParams({
      studentId: balanceQueryTarget,
      export: '1',
    })

    window.location.href = `/api/payments/wallet-transactions?${params.toString()}`
  }

  function handleRechargeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (role === 'PARENT' && !rechargeTarget) {
      setError('اختر الابن أولا')
      return
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('أدخل مبلغًا صحيحًا')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/payments/recharge/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: rechargeTarget,
            amount: numericAmount,
            description,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data?.message ?? 'تعذر بدء عملية الشحن')

        const checkoutUrl = data?.data?.checkoutUrl
        if (!checkoutUrl) throw new Error('رابط الدفع غير متوفر')
        window.location.href = checkoutUrl
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشلت عملية الشحن')
      }
    })
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">المحفظة</h1>
        <p className="text-sm text-slate-500">
          {role === 'PARENT'
            ? 'اختر أحد الأبناء لعرض الرصيد والعمليات المرتبطة به.'
            : 'استخدم رصيدك للدفع الداخلي من المحفظة.'}
        </p>
      </div>

      {role === 'PARENT' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <label className="text-sm font-semibold">اختيار المحفظة</label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-sky-950/40"
              value={selectedWalletTargetId}
              onChange={(e) => setSelectedWalletTargetId(e.target.value)}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm text-slate-500">الرصيد الحالي</p>
          <p className="break-words text-3xl font-extrabold text-sky-700 drop-shadow-[0_0_14px_rgba(14,165,233,0.18)] dark:text-cyan-300 dark:drop-shadow-[0_0_14px_rgba(34,211,238,0.28)] sm:text-4xl">
            {isLoading ? 'جارٍ التحميل...' : formatCurrency(wallet?.balance ?? 0)}
          </p>
          {wallet?.updatedAt && (
            <p className="text-xs text-slate-500">آخر تحديث: {new Date(wallet.updatedAt).toLocaleString('ar-EG')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">آخر عمليات المحفظة</h2>
              <p className="text-sm text-slate-500">
                آخر 20 عملية خاصة بالمحفظة المختارة.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              disabled={!balanceQueryTarget}
              onClick={handleDownloadTransactions}
            >
              <Download className="h-4 w-4" />
              تحميل آخر 3 شهور
            </Button>
          </div>

          {isTransactionsLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              جارٍ تحميل العمليات...
            </div>
          ) : transactionsError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-5 text-sm text-rose-300">
              {transactionsError}
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              لا توجد عمليات مسجلة لهذه المحفظة.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.map((transaction) => {
                  const isDebit = transaction.signedAmount < 0

                  return (
                    <div
                      key={transaction.id}
                      className="grid gap-3 bg-white px-3 py-3 dark:bg-slate-900/50 sm:grid-cols-[1fr_auto] sm:items-center sm:px-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950 dark:text-white">{transaction.typeLabel}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {transaction.statusLabel}
                          </span>
                        </div>
                        <p className="truncate text-sm text-slate-700 dark:text-slate-300">{transaction.reason}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(transaction.createdAt)}
                          {transaction.payment?.receiptNumber ? ` · ${transaction.payment.receiptNumber}` : ''}
                        </p>
                      </div>
                      <p className={isDebit ? 'text-start font-bold text-rose-300 sm:text-left' : 'text-start font-bold text-emerald-300 sm:text-left'}>
                        {isDebit ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="text-lg font-bold">شحن الرصيد</h2>
          <form className="space-y-3" onSubmit={handleRechargeSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-semibold">المبلغ (ج.م)</label>
              <Input
                className="border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-sky-400 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="مثال: 500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">الوصف (اختياري)</label>
              <Input
                className="border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-sky-400 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="شحن المحفظة"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'جارٍ التحويل...' : 'الدفع عبر كاشير'}
              </Button>
              {adminContactUrl ? (
                <a
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-100 dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/20"
                  href={adminContactUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  تواصل مع الإدارة
                </a>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
