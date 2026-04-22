export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { getTeacherTransfers } from '@/modules/payments/queries'

function transferStatusLabel(status: string) {
  if (status === 'PENDING') return 'قيد الانتظار'
  if (status === 'SUCCESS') return 'ناجح'
  if (status === 'FAILED') return 'فاشل'
  if (status === 'RETRY') return 'إعادة محاولة'
  return status
}

export default async function PaymentsTransfersPage() {
  const tenant = await requireTenant()
  const user = await requireAuth()

  if (!['TEACHER', 'ASSISTANT'].includes(user.role)) {
    redirect(user.role === 'STUDENT' ? '/student' : '/parent')
  }

  const transfers = await getTeacherTransfers(tenant.id, 100)

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">تحويلات المعلم</h1>
        <p className="text-sm text-slate-500">محاولات التحويل التلقائي وحالة كل محاولة.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-start">التاريخ</th>
              <th className="px-4 py-3 text-start">الدفع</th>
              <th className="px-4 py-3 text-start">المبلغ</th>
              <th className="px-4 py-3 text-start">العمولة</th>
              <th className="px-4 py-3 text-start">الحالة</th>
              <th className="px-4 py-3 text-start">عدد المحاولات</th>
              <th className="px-4 py-3 text-start">سبب الفشل</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>لا توجد سجلات تحويل حتى الآن.</td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(transfer.createdAt).toLocaleString('ar-EG')}</td>
                  <td className="px-4 py-3 font-mono text-xs">{transfer.paymentId}</td>
                  <td className="px-4 py-3">{transfer.amount.toLocaleString('ar-EG')} ج.م</td>
                  <td className="px-4 py-3">{transfer.fee.toLocaleString('ar-EG')} ج.م</td>
                  <td className="px-4 py-3">{transferStatusLabel(transfer.status)}</td>
                  <td className="px-4 py-3">{transfer.attemptCount}</td>
                  <td className="px-4 py-3 text-rose-600">{transfer.failureReason ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
