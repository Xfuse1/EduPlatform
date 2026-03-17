import { requireTenant } from '@/lib/tenant'
import { getStudents } from '@/modules/students/queries'
import { PaymentForm } from '@/modules/payments/components/PaymentForm'

// ── B-04.5: Record Payment Page ──────────────────────────────────────────────

export default async function RecordPaymentPage() {
  const tenant = await requireTenant()
  // استورد قائمة الطلاب من Person A's queries (موجودة ومكتملة)
  const students = await getStudents(tenant.id)

  // نأخذ فقط البيانات المطلوبة للفورم
  type StudentEntry = { id: string; name: string; gradeLevel: string | null }
  const studentsList = (students as StudentEntry[]).map((s) => ({
    id: s.id,
    name: s.name,
    gradeLevel: s.gradeLevel,
  }))

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">تسجيل دفعة</h1>
      <PaymentForm students={studentsList} />
    </div>
  )
}
