'use client'

import { X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { adjustUserWalletAction } from '@/modules/admin/actions'
import { AdminFinanceSelect } from '@/modules/admin/components/AdminFinanceSelect'
import { AdminFinanceSubmitButton } from '@/modules/admin/components/AdminFinanceSubmitButton'
import {
  confirmFirebasePhoneOtp,
  resetFirebasePhoneOtp,
  sendFirebasePhoneOtp,
} from '@/modules/auth/lib/firebasePhoneOtp'

type WalletChild = {
  id: string
  name: string
  phone: string
}

type WalletAdjustmentFormProps = {
  wallet: {
    tenantId: string
    userId: string
    user: {
      name: string
      phone: string
      role: string
    }
    children: WalletChild[]
  }
}

const compactControlClass =
  'h-10 min-w-0 rounded-xl border border-sky-300/20 bg-slate-950/85 px-3 text-sm font-semibold text-slate-100 placeholder:text-slate-500 outline-none transition [color-scheme:dark] hover:border-sky-300/40 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/15 [&>option]:bg-slate-950 [&>option]:text-slate-100'

const walletOperationOptions = [
  { value: 'CREDIT', label: 'إضافة رصيد' },
  { value: 'DEBIT', label: 'خصم رصيد' },
  { value: 'PAYOUT', label: 'تسجيل سحب' },
]

const adminWithdrawalMethodOptions = [
  { value: 'CASH', label: 'سحب كاش' },
  { value: 'ELECTRONIC_WALLET', label: 'محفظة إلكترونية' },
  { value: 'INSTAPAY', label: 'InstaPay' },
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
  { value: 'OTHER', label: 'طريقة أخرى' },
]

function getErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
    message.includes('unable to verify the first certificate')
  ) {
    return 'تعذر التحقق من كود Firebase بسبب شهادة الاتصال المحلية. أعد المحاولة بعد تحديث الصفحة.'
  }

  return error instanceof Error ? error.message : fallback
}

export function AdminWalletAdjustmentForm({ wallet }: WalletAdjustmentFormProps) {
  const router = useRouter()
  const [pendingDebit, setPendingDebit] = useState<Array<[string, FormDataEntryValue]> | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [otpError, setOtpError] = useState('')

  const otpContainerId = useMemo(
    () => `admin-wallet-debit-otp-${wallet.userId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [wallet.userId],
  )
  const isOtpOpen = pendingDebit !== null
  const isBusy = isSubmitting || isSendingOtp || isVerifyingOtp

  async function submitAdjustment(formData: FormData) {
    setIsSubmitting(true)
    setFormError('')
    setFormMessage('')

    try {
      await adjustUserWalletAction(formData)
      setFormMessage('تم تنفيذ العملية')
      router.refresh()
    } catch (error) {
      setFormError(getErrorMessage(error, 'تعذر تنفيذ العملية'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function sendDebitOtp(nextPendingDebit: Array<[string, FormDataEntryValue]>) {
    setIsSendingOtp(true)
    setOtpError('')
    setOtpSent(false)
    setOtpCode('')
    setPendingDebit(nextPendingDebit)

    try {
      const result = await sendFirebasePhoneOtp(wallet.user.phone, otpContainerId)
      if (!result.success) {
        setOtpError(result.message ?? 'تعذر إرسال كود التحقق')
        return
      }

      setOtpSent(true)
    } catch (error) {
      setOtpError(getErrorMessage(error, 'تعذر إرسال كود التحقق'))
    } finally {
      setIsSendingOtp(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isBusy) return

    const formData = new FormData(event.currentTarget)
    const operation = String(formData.get('operation') ?? '')

    if (operation === 'DEBIT') {
      await sendDebitOtp(Array.from(formData.entries()))
      return
    }

    await submitAdjustment(formData)
  }

  async function closeOtpModal() {
    await resetFirebasePhoneOtp()
    setPendingDebit(null)
    setOtpCode('')
    setOtpSent(false)
    setOtpError('')
  }

  async function confirmDebitOtp() {
    if (!pendingDebit || isVerifyingOtp) return
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('أدخل كود تحقق مكوّن من 6 أرقام')
      return
    }

    setIsVerifyingOtp(true)
    setOtpError('')
    setFormError('')
    setFormMessage('')

    try {
      const confirmed = await confirmFirebasePhoneOtp(otpCode)
      if (!confirmed.success || !confirmed.idToken) {
        setOtpError(confirmed.message ?? 'كود التحقق غير صحيح')
        return
      }

      const formData = new FormData()
      for (const [key, value] of pendingDebit) {
        formData.append(key, value)
      }
      formData.set('otpIdToken', confirmed.idToken)

      await adjustUserWalletAction(formData)
      await closeOtpModal()
      setFormMessage('تم تنفيذ خصم الرصيد')
      router.refresh()
    } catch (error) {
      setOtpError(getErrorMessage(error, 'تعذر تنفيذ خصم الرصيد'))
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="tenantId" type="hidden" value={wallet.tenantId} />
        <input name="userId" type="hidden" value={wallet.userId} />
        {wallet.user.role === 'PARENT' && wallet.children.length > 0 ? (
          <div className="sm:col-span-2">
            <p className="mb-1 text-xs font-bold text-slate-400">اختيار الابن المستهدف بالمبلغ</p>
            <AdminFinanceSelect
              defaultValue={wallet.children[0].id}
              name="targetStudentId"
              options={wallet.children.map((child) => ({
                value: child.id,
                label: `${child.name}${child.phone ? ` - ${child.phone}` : ''}`,
              }))}
            />
          </div>
        ) : null}
        <AdminFinanceSelect defaultValue="CREDIT" name="operation" options={walletOperationOptions} />
        <AdminFinanceSelect defaultValue="CASH" name="adminWithdrawalMethod" options={adminWithdrawalMethodOptions} />
        <input className={compactControlClass} name="amount" placeholder="المبلغ" inputMode="numeric" />
        <input className={compactControlClass} name="reason" placeholder="السبب" />
        {formError ? <p className="text-xs font-bold text-rose-300 sm:col-span-2">{formError}</p> : null}
        {formMessage ? <p className="text-xs font-bold text-emerald-300 sm:col-span-2">{formMessage}</p> : null}
        <AdminFinanceSubmitButton
          pending={isSubmitting || isSendingOtp}
          className="h-10 rounded-xl bg-gradient-to-l from-sky-500 to-cyan-400 px-4 text-sm font-extrabold text-white shadow-lg shadow-sky-950/25 transition hover:brightness-110 disabled:hover:brightness-100 sm:col-span-2"
        >
          تنفيذ
        </AdminFinanceSubmitButton>
      </form>

      <div id={otpContainerId} aria-hidden="true" />

      {isOtpOpen ? (
        <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-slate-950/80 p-4 text-right shadow-inner shadow-cyan-950/20" dir="rtl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-white">تأكيد خصم الرصيد</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                تم إرسال كود تحقق لصاحب الحساب على <span dir="ltr">{wallet.user.phone}</span>
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 text-slate-200 transition hover:bg-slate-800"
              onClick={closeOtpModal}
              disabled={isVerifyingOtp}
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className={compactControlClass}
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 text-sm font-bold text-white transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => pendingDebit && sendDebitOtp(pendingDebit)}
                disabled={isBusy}
              >
                إعادة إرسال
              </button>
              <button
                type="button"
                className="h-10 rounded-xl bg-gradient-to-l from-sky-500 to-cyan-400 px-3 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={confirmDebitOtp}
                disabled={isBusy || !otpSent}
              >
                {isVerifyingOtp ? 'جارٍ التحقق...' : 'تأكيد الخصم'}
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {otpError ? <p className="text-xs font-bold text-rose-300">{otpError}</p> : null}
            {isSendingOtp ? <p className="text-xs font-bold text-cyan-200">جارٍ إرسال كود التحقق...</p> : null}
            {otpSent ? <p className="text-xs font-bold text-emerald-300">تم إرسال الكود</p> : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
