import { NextRequest, NextResponse } from 'next/server'

import { EnrollmentStatus, UserRole, type Prisma } from '@/generated/client'
import { errorResponse, successResponse } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { getOrCreateWallet, resolveRechargeWalletOwner } from '@/modules/wallet/provider'

const STUDENT_ACCESS_STATUSES = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.WAITLIST,
  EnrollmentStatus.PENDING,
]

function readMetadataString(metadata: Prisma.JsonValue | null, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null

  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

function getTransactionDirection(transaction: {
  type: string
  metadata: Prisma.JsonValue | null
}) {
  const explicitDirection = readMetadataString(transaction.metadata, 'direction')
  if (explicitDirection === 'CREDIT' || explicitDirection === 'DEBIT' || explicitDirection === 'PAYOUT') {
    return explicitDirection
  }

  if (transaction.type === 'DEBIT' || transaction.type === 'PAYOUT') return 'DEBIT'
  return 'CREDIT'
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function formatCsvDate(value: Date) {
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value)
}

function transactionTypeLabel(type: string, direction: string) {
  if (type === 'ADMIN_ADJUSTMENT') return direction === 'DEBIT' ? 'تعديل خصم' : 'تعديل إضافة'
  if (type === 'PAYOUT') return 'سحب'
  if (type === 'DEBIT') return 'خصم'
  return 'إضافة رصيد'
}

function transactionStatusLabel(status: string) {
  if (status === 'COMPLETED') return 'مكتملة'
  if (status === 'PENDING') return 'معلقة'
  if (status === 'FAILED') return 'فشلت'
  if (status === 'REFUNDED') return 'مستردة'
  return status
}

async function resolveRequestContext(req: NextRequest) {
  const tenant = await requireTenant()
  const user = await requireAuth(req)
  const { searchParams } = new URL(req.url)
  const requestedStudentId = searchParams.get('studentId')?.trim() ?? ''

  if (user.role === UserRole.PARENT) {
    if (!requestedStudentId || requestedStudentId === user.id) {
      return {
        tenantId: tenant.id,
        walletUserId: user.id,
        subjectId: undefined,
        subjectName: user.name ?? 'محفظتي',
      }
    }

    const linkedChild = await db.parentStudent.findFirst({
      where: {
        parentId: user.id,
        studentId: requestedStudentId,
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            tenantId: true,
            groupStudents: {
              where: {
                status: { in: STUDENT_ACCESS_STATUSES },
              },
              select: {
                group: {
                  select: {
                    tenantId: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!linkedChild) throw new Error('الابن غير مرتبط بحساب ولي الأمر')

    return {
      tenantId: linkedChild.student.groupStudents[0]?.group.tenantId ?? linkedChild.student.tenantId,
      walletUserId: undefined,
      subjectId: linkedChild.student.id,
      subjectName: linkedChild.student.name,
    }
  }

  if (user.role === UserRole.STUDENT) {
    if (requestedStudentId && requestedStudentId !== user.id) {
      throw new Error('ليس لديك صلاحية لعرض عمليات هذا الطالب')
    }

    return {
      tenantId: tenant.id,
      walletUserId: undefined,
      subjectId: user.id,
      subjectName: user.name,
    }
  }

  throw new Error('عرض عمليات المحفظة غير متاح لهذا الحساب')
}

function buildTransactionWhere(input: {
  tenantId: string
  walletId: string
  subjectId?: string
  fromDate?: Date
}): Prisma.WalletTransactionWhereInput {
  return {
    tenantId: input.tenantId,
    walletId: input.walletId,
    ...(input.fromDate ? { createdAt: { gte: input.fromDate } } : {}),
    ...(input.subjectId
      ? {
          OR: [
            {
              metadata: {
                path: ['studentId'],
                equals: input.subjectId,
              },
            },
            {
              metadata: {
                path: ['requestedUserId'],
                equals: input.subjectId,
              },
            },
            {
              payment: {
                is: {
                  studentId: input.subjectId,
                },
              },
            },
            {
              userId: input.subjectId,
            },
          ],
        }
      : {}),
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const shouldExport = searchParams.get('export') === '1'
    const requestedLimit = Number(searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 20
    const context = await resolveRequestContext(req)
    const ownerUserId = context.walletUserId ?? (await resolveRechargeWalletOwner(context.subjectId ?? '', context.tenantId)).ownerUserId
    const wallet = await getOrCreateWallet(context.tenantId, ownerUserId)
    const fromDate = shouldExport ? new Date() : undefined

    if (fromDate) {
      fromDate.setMonth(fromDate.getMonth() - 3)
    }

    const transactions = await db.walletTransaction.findMany({
      where: buildTransactionWhere({
        tenantId: context.tenantId,
        walletId: wallet.id,
        subjectId: context.subjectId,
        fromDate,
      }),
      include: {
        payment: {
          select: {
            id: true,
            month: true,
            method: true,
            status: true,
            receiptNumber: true,
            paidAt: true,
            paymentGateway: true,
            studentId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(shouldExport ? {} : { take: limit }),
    })

    const rows = transactions.map((transaction) => {
      const direction = getTransactionDirection(transaction)

      return {
        id: transaction.id,
        type: transaction.type,
        typeLabel: transactionTypeLabel(transaction.type, direction),
        direction,
        amount: transaction.amount,
        signedAmount: direction === 'DEBIT' || direction === 'PAYOUT' ? -transaction.amount : transaction.amount,
        reason: transaction.reason,
        status: transaction.status,
        statusLabel: transactionStatusLabel(transaction.status),
        createdAt: transaction.createdAt.toISOString(),
        payment: transaction.payment
          ? {
              id: transaction.payment.id,
              month: transaction.payment.month,
              method: transaction.payment.method,
              status: transaction.payment.status,
              receiptNumber: transaction.payment.receiptNumber,
              paidAt: transaction.payment.paidAt?.toISOString() ?? null,
              paymentGateway: transaction.payment.paymentGateway,
            }
          : null,
      }
    })

    if (shouldExport) {
      const header = ['التاريخ', 'الحساب', 'النوع', 'الحالة', 'المبلغ', 'الوصف', 'الشهر', 'طريقة الدفع', 'رقم الإيصال']
      const body = rows.map((row) => [
        formatCsvDate(new Date(row.createdAt)),
        context.subjectName,
        row.typeLabel,
        row.statusLabel,
        row.signedAmount,
        row.reason,
        row.payment?.month ?? '',
        row.payment?.method ?? '',
        row.payment?.receiptNumber ?? '',
      ].map(csvCell).join(','))

      const csv = `\ufeff${header.map(csvCell).join(',')}\n${body.join('\n')}`
      const safeDate = new Date().toISOString().slice(0, 10)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="wallet-transactions-${context.subjectId ?? context.walletUserId}-${safeDate}.csv"`,
        },
      })
    }

    return successResponse({
      targetId: context.subjectId ?? context.walletUserId,
      targetName: context.subjectName,
      transactions: rows,
    })
  } catch (error) {
    return errorResponse(
      'WALLET_TRANSACTIONS_FAILED',
      error instanceof Error ? error.message : 'تعذر تحميل عمليات المحفظة',
      400,
    )
  }
}
