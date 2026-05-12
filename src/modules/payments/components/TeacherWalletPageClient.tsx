'use client'

import { FileText, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toWhatsAppUrl } from '@/lib/phone'
import { requestTeacherWalletWithdrawal } from '@/modules/payments/actions'

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  SUCCESS: 'تم بنجاح',
  FAILED: 'فشل',
  CANCELLED: 'ملغي',
}

const FAILURE_REASON_LABELS: Record<string, string> = {
  KASHIER_TRANSFER_API_PENDING_INTEGRATION: 'ميزة السحب المباشر عبر Kashier قيد التطوير وستتاح قريباً',
  KASHIER_TRANSFER_API_ERROR: 'خطأ في الاتصال بـ Kashier',
  KASHIER_TRANSFER_FAILED: 'فشل تحويل Kashier',
  PAYOUT_WALLET_DEBIT_FAILED: 'فشل خصم الرصيد من المحفظة',
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  CREDIT: 'إضافة',
  DEBIT: 'خصم',
  ADMIN_ADJUSTMENT: 'تعديل إداري',
  PAYOUT: 'سحب',
}

const ATTENDANCE_METHOD_LABELS: Record<string, string> = {
  MANUAL: 'يدوي',
  QR: 'QR',
  GPS: 'GPS',
  CODE: 'كود',
  QR_GUEST: 'QR ضيف',
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EXCUSED: 'معذور',
}

type TeacherWalletData = Awaited<ReturnType<typeof import('@/modules/payments/queries').getTeacherWalletPageData>>
type ActivityItem = TeacherWalletData['activityItems'][number]

function formatFailureReason(reason: string | null | undefined) {
  if (!reason) return null
  return FAILURE_REASON_LABELS[reason] ?? reason
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-EG')} ج.م`
}

function formatDate(value: Date | string | null) {
  if (!value) return 'لم يتم'
  return new Date(value).toLocaleString('ar-EG')
}

function formatDateOnly(value: Date | string | null) {
  if (!value) return 'غير محدد'
  return new Date(value).toLocaleDateString('ar-EG')
}

function getActivityDirection(item: ActivityItem) {
  if (item.kind === 'GROUP_SESSION') return 'CREDIT'
  if (item.direction === 'CREDIT' || item.direction === 'DEBIT') return item.direction
  return item.type === 'PAYOUT' || item.type === 'DEBIT' ? 'DEBIT' : 'CREDIT'
}

function isDebitActivity(item: ActivityItem) {
  return getActivityDirection(item) === 'DEBIT'
}

function getTypeLabel(type: string) {
  return TRANSACTION_TYPE_LABELS[type] ?? type
}

function getNoteValue(notes: string | null | undefined, key: string) {
  const line = notes?.split('\n').find((item) => item.startsWith(`${key}:`))
  return line?.slice(key.length + 1).trim() || null
}

function getSubscriptionPaymentDetails(payment: NonNullable<Extract<ActivityItem, { kind: 'TRANSACTION' }>['payment']>) {
  const notes = payment.notes ?? ''
  const firstLine = notes.split('\n')[0]?.trim() ?? ''
  if (!firstLine.startsWith('SUBSCRIPTION:')) return null

  const [, plan, cycle] = firstLine.split(':')
  const walletContribution = Number(getNoteValue(notes, 'WALLET_CONTRIBUTION') ?? 0)
  const kashierAmount = Number(getNoteValue(notes, 'KASHIER_AMOUNT') ?? payment.amount)
  const totalAmount = Number(getNoteValue(notes, 'SUBSCRIPTION_TOTAL') ?? payment.amount)

  return {
    plan: plan?.trim() || 'غير محدد',
    cycle: cycle?.trim() || 'غير محدد',
    walletContribution: Number.isFinite(walletContribution) ? walletContribution : 0,
    kashierAmount: Number.isFinite(kashierAmount) ? kashierAmount : payment.amount,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : payment.amount,
  }
}

function ActivityDetailsDialog({
  item,
  onClose,
}: {
  item: ActivityItem | null
  onClose: () => void
}) {
  if (!item) return null

  const isDebit = isDebitActivity(item)
  const amountClass = isDebit ? 'text-rose-600' : 'text-emerald-600'

  return (
    <Dialog open={!!item} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            {item.kind === 'GROUP_SESSION'
              ? `حصة ${formatDateOnly(item.sessionDate)} - ${item.studentCount.toLocaleString('ar-EG')} طالب`
              : `${getTypeLabel(item.type)} - ${formatDate(item.createdAt)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">المبلغ</p>
              <p className={`mt-1 text-lg font-extrabold ${amountClass}`}>
                {isDebit ? '-' : '+'}{formatCurrency(item.amount)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">النوع</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">
                {item.kind === 'GROUP_SESSION' ? 'حضور مجموعة' : getTypeLabel(item.type)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">الحالة</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">{item.status}</p>
            </div>
          </div>

          {item.kind === 'GROUP_SESSION' ? (
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="min-w-[680px]">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:bg-slate-900">
                <span>الطالب</span>
                <span>المبلغ</span>
                <span>طريقة الحضور</span>
                <span>حالة الحضور</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {item.details.map((detail) => (
                  <div
                    key={detail.id}
                    className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr] gap-3 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">{detail.studentName}</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(detail.amount)}</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {detail.attendanceMethod ? ATTENDANCE_METHOD_LABELS[detail.attendanceMethod] ?? detail.attendanceMethod : 'غير مسجل'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {detail.attendanceStatus ? ATTENDANCE_STATUS_LABELS[detail.attendanceStatus] ?? detail.attendanceStatus : 'غير مسجل'}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500">سبب المعاملة</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{item.reason}</p>
              </div>

              {item.payment ? (() => {
                const subscriptionPayment = getSubscriptionPaymentDetails(item.payment)

                if (subscriptionPayment) {
                  return (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-white">دفعة اشتراك</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <p>الباقة: {subscriptionPayment.plan}</p>
                        <p>دورة الاشتراك: {subscriptionPayment.cycle === 'MONTHLY' ? 'شهري' : subscriptionPayment.cycle === 'YEARLY' ? 'سنوي' : subscriptionPayment.cycle}</p>
                        <p>إجمالي سعر الاشتراك: {formatCurrency(subscriptionPayment.totalAmount)}</p>
                        <p>المدفوع من المحفظة: {formatCurrency(subscriptionPayment.walletContribution)}</p>
                        <p>المدفوع عبر كاشير: {formatCurrency(subscriptionPayment.kashierAmount)}</p>
                        <p>حالة الدفع: {item.payment.status}</p>
                        <p>رقم الإيصال: {item.payment.receiptNumber ?? 'غير متوفر'}</p>
                        <p>بوابة الدفع: {item.payment.paymentGateway}</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">دفعة مرتبطة</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p>الطالب: {item.payment.studentName}</p>
                      <p>الشهر: {item.payment.month}</p>
                      <p>طريقة الدفع: {item.payment.method}</p>
                      <p>حالة الدفع: {item.payment.status}</p>
                    </div>
                  </div>
                )
              })() : null}

              {item.withdrawal ? (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">طلب سحب مرتبط</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p>طريقة السحب: {item.withdrawal.method}</p>
                    <p>طريقة الإدارة: {item.withdrawal.adminMethod ?? 'غير محدد'}</p>
                    <p>حالة السحب: {WITHDRAWAL_STATUS_LABELS[item.withdrawal.status] ?? item.withdrawal.status}</p>
                    <p>تاريخ الطلب: {formatDate(item.withdrawal.requestedAt)}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TeacherWalletPageClient({ data }: { data: TeacherWalletData }) {
  const [amount, setAmount] = useState(String(data.wallet.balance > 0 ? data.wallet.balance : ''))
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)
  const [, startTransition] = useTransition()

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
    <div className="space-y-5 pb-8 sm:space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">محفظة المعلم</h1>
          <p className="text-sm text-slate-500">رصيد المدفوعات التي تم تحصيلها لحسابك بعد خصم رسوم المنصة.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {adminContactUrl ? (
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              href={adminContactUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              تواصل مع الإدارة
            </a>
          ) : null}
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-primary to-secondary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:from-[#164766] hover:to-[#2777ad]"
            href="/payments/subscription"
          >
            <FileText className="h-4 w-4" />
            الاشتراك
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-slate-500">الرصيد الحالي</p>
            <p className="break-words text-3xl font-extrabold text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.28)] sm:text-4xl">{formatCurrency(data.wallet.balance)}</p>
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
              <p className="text-sm text-slate-500">السحب لا يتم تلقائياً. اختر طريقة السحب عند الحاجة.</p>
            </div>
            <Link className="text-sm font-bold text-sky-600 hover:underline" href="/teacher/settings">
              إعدادات Kashier
            </Link>
          </div>

          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
            ميزة السحب المباشر عبر Kashier قيد التطوير وستتاح قريباً. للسحب الآن تواصل مع الإدارة.
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

          {message ? (
            <p className={message.type === 'success' ? 'text-sm text-emerald-600' : 'text-sm text-rose-600'}>
              {message.text}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-bold">آخر معاملات المحفظة</h2>
            {data.activityItems.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد معاملات بعد.</p>
            ) : (
              data.activityItems.map((item) => {
                const isDebit = isDebitActivity(item)
                const amountClass = isDebit ? 'text-rose-600' : 'text-emerald-600'
                const metaLabel = item.kind === 'GROUP_SESSION'
                  ? `حصة ${formatDateOnly(item.sessionDate)} | ${item.studentCount.toLocaleString('ar-EG')} طالب`
                  : `${getTypeLabel(item.type)} | ${formatDate(item.createdAt)}`

                return (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-bold">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{metaLabel}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        <p className={`font-bold ${amountClass}`}>
                          {isDebit ? '-' : '+'}{formatCurrency(item.amount)}
                        </p>
                        <Button
                          className="min-h-9 rounded-lg px-3 py-2 text-xs"
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedActivity(item)}
                        >
                          تفاصيل
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
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

      <ActivityDetailsDialog item={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </div>
  )
}
