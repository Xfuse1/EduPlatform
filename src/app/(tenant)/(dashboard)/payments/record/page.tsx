import { requireAuth } from '@/lib/auth'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { PaymentForm } from '@/modules/payments/components/PaymentForm'
import { getStudents } from '@/modules/students/queries'

// B-04.5: Record Payment Page

export default async function RecordPaymentPage() {
  const tenant = await requireTenant()
  const user = await requireAuth()
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
  const students = await getStudents(tenant.id, {}, teacherScopeUserId ?? undefined)

  type StudentEntry = { id: string; name: string; gradeLevel: string | null }
  const studentsList = (students as StudentEntry[]).map((student) => ({
    id: student.id,
    name: student.name,
    gradeLevel: student.gradeLevel,
  }))

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">تسجيل دفعة</h1>
      <PaymentForm students={studentsList} />
    </div>
  )
}
