'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-EG')} ج.م`
}

export function WalletPageClient({
  role,
  userId,
  children = [],
}: {
  role: WalletRole
  userId: string
  children?: ParentChild[]
}) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? '')
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('شحن المحفظة')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const balanceQueryTarget = useMemo(() => {
    if (role === 'PARENT') return selectedChildId
    return userId
  }, [role, selectedChildId, userId])

  const rechargeTarget = role === 'PARENT' ? userId : userId

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

  function handleRechargeSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">المحفظة</h1>
        <p className="text-sm text-slate-500">
          {role === 'PARENT'
            ? 'محفظة ولي الأمر مشتركة بين جميع الأبناء المرتبطين.'
            : 'استخدم رصيدك للدفع الداخلي من المحفظة.'}
        </p>
      </div>

      {role === 'PARENT' && children.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <label className="text-sm font-semibold">اختيار الابن لعرض الرصيد</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
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
          <p className="text-3xl font-extrabold text-primary">
            {isLoading ? 'جارٍ التحميل...' : formatCurrency(wallet?.balance ?? 0)}
          </p>
          {wallet?.updatedAt && (
            <p className="text-xs text-slate-500">آخر تحديث: {new Date(wallet.updatedAt).toLocaleString('ar-EG')}</p>
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
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="مثال: 500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">الوصف (اختياري)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="شحن المحفظة"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'جارٍ التحويل...' : 'الدفع عبر كاشير'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
