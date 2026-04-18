'use server'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'

// ── Balance Management Helper Functions ────────────────────────────────────

/**
 * الحصول على رصيد الطالب أو ولي الأمر
 * إذا كان الطالب مرتبطاً بولي أمر، يرجع رصيد ولي الأمر
 * وإلا يرجع رصيد الطالب مباشرة
 */
export async function getStudentBalance(studentId: string, tenantId: string) {
  // تحقق من وجود الطالب
  const student = await db.user.findFirst({
    where: { id: studentId, tenantId, role: 'STUDENT' },
    include: { parentStudents: { include: { parent: true } } },
  })

  if (!student) throw new Error('الطالب غير موجود')

  // إذا كان الطالب مرتبطاً بولي أمر
  if (student.parentStudents && student.parentStudents.length > 0) {
    const parentId = student.parentStudents[0].parentId
    const parentBalance = await db.studentBalance.findFirst({
      where: { studentId: parentId, tenantId },
    })
    return { balance: parentBalance, owner: 'PARENT', ownerId: parentId }
  }

  // وإلا جيب رصيد الطالب نفسه
  const studentBalance = await db.studentBalance.findFirst({
    where: { studentId, tenantId },
  })

  return { balance: studentBalance, owner: 'STUDENT', ownerId: studentId }
}

/**
 * خصم من رصيد الطالب/ولي الأمر
 * - يتحقق من وجود رصيد كافي
 * - ينشئ transaction للخصم
 * - يحدّث الرصيد
 */
export async function debitBalance(
  studentId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const tenant = await requireTenant()

  // جيب معلومات الرصيد
  const { balance, ownerId } = await getStudentBalance(studentId, tenant.id)

  if (!balance) {
    throw new Error('لا يوجد رصيد للطالب - تفضل أضف رصيد أولاً')
  }

  if (balance.balance < amount) {
    throw new Error(
      `رصيد غير كافي! الرصيد المتاح: ${balance.balance} جنيه، المبلغ المطلوب: ${amount} جنيه`,
    )
  }

  // استخدم transaction للتأكد من عدم حدوث race condition
  const result = await db.$transaction(async (tx) => {
    // تحديث الرصيد
    const updatedBalance = await tx.studentBalance.update({
      where: { id: balance.id },
      data: { balance: balance.balance - amount },
    })

    // إنشاء transaction record
    const transaction = await tx.balanceTransaction.create({
      data: {
        tenantId: tenant.id,
        balanceId: balance.id,
        type: 'DEBIT',
        amount,
        reason,
        relatedPaymentId,
        status: 'COMPLETED',
      },
    })

    return { balance: updatedBalance, transaction }
  })

  return result
}

/**
 * إضافة رصيد للطالب/ولي الأمر
 * - ينشئ transaction للإضافة
 * - يحدّث الرصيد
 */
export async function creditBalance(
  userId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const tenant = await requireTenant()

  // جيب الرصيد أو أنشئه إذا لم يكن موجوداً
  let balance = await db.studentBalance.findFirst({
    where: { studentId: userId, tenantId: tenant.id },
  })

  if (!balance) {
    balance = await db.studentBalance.create({
      data: {
        tenantId: tenant.id,
        studentId: userId,
        balance: 0,
      },
    })
  }

  // استخدم transaction
  const result = await db.$transaction(async (tx) => {
    // تحديث الرصيد
    const updatedBalance = await tx.studentBalance.update({
      where: { id: balance!.id },
      data: { balance: balance!.balance + amount, lastRechargedAt: new Date() },
    })

    // إنشاء transaction record
    const transaction = await tx.balanceTransaction.create({
      data: {
        tenantId: tenant.id,
        balanceId: balance!.id,
        type: 'CREDIT',
        amount,
        reason,
        relatedPaymentId,
        status: 'COMPLETED',
      },
    })

    return { balance: updatedBalance, transaction }
  })

  return result
}

/**
 * جلب سجل المعاملات للرصيد
 */
export async function getBalanceTransactions(
  studentId: string,
  limit: number = 50,
) {
  const tenant = await requireTenant()

  // جيب الرصيد أولاً
  const balance = await db.studentBalance.findFirst({
    where: { studentId, tenantId: tenant.id },
  })

  if (!balance) return []

  const transactions = await db.balanceTransaction.findMany({
    where: {
      balanceId: balance.id,
      tenantId: tenant.id,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return transactions
}

/**
 * حساب إجمالي الدخل من الطلاب في شهر معين
 * (للمعلم لعرض الأرباح)
 */
export async function getTeacherMonthlyIncome(month: string) {
  const tenant = await requireTenant()

  const income = await db.payment.aggregate({
    where: {
      tenantId: tenant.id,
      month,
      status: 'PAID',
    },
    _sum: {
      amount: true,
    },
  })

  return income._sum.amount ?? 0
}
