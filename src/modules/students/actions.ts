'use server'

import { randomUUID } from 'node:crypto'

import {
  EnrollmentStatus,
  Prisma,
  type UserRole,
  UserRole as PrismaUserRole,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'

import {
  parseStudentFormData,
  parseStudentImportRecord,
  type StudentCreateInput,
} from './validations'

const MANAGE_STUDENT_ROLES: UserRole[] = ['TEACHER', 'ASSISTANT']
const GENERATED_PHONE_PREFIX = '__student_without_phone__'

function assertCanManageStudents(role: UserRole) {
  if (!MANAGE_STUDENT_ROLES.includes(role)) {
    throw new Error('ليس لديك صلاحية لإدارة الطلاب')
  }
}

function isGeneratedStudentPhone(phone: string) {
  return phone.startsWith(GENERATED_PHONE_PREFIX)
}

function createGeneratedStudentPhone() {
  return `${GENERATED_PHONE_PREFIX}_${randomUUID()}`
}

function getStoredStudentPhone(phone?: string, currentPhone?: string) {
  if (phone) {
    return phone
  }

  if (currentPhone && isGeneratedStudentPhone(currentPhone)) {
    return currentPhone
  }

  return createGeneratedStudentPhone()
}

function revalidateStudentPages(studentId?: string, groupId?: string) {
  revalidatePath(ROUTES.teacher.students)
  revalidatePath(ROUTES.teacher.newStudent)
  revalidatePath(ROUTES.teacher.importStudents)

  if (studentId) {
    revalidatePath(`${ROUTES.teacher.students}/${studentId}`)
  }

  revalidatePath(ROUTES.teacher.groups)

  if (groupId) {
    revalidatePath(`${ROUTES.teacher.groups}/${groupId}`)
    revalidatePath(`${ROUTES.teacher.groups}/${groupId}/edit`)
  }
}

async function getScopedStudent(tenantId: string, studentId: string) {
  return db.user.findFirst({
    where: {
      id: studentId,
      tenantId,
      role: PrismaUserRole.STUDENT,
    },
  })
}

async function getScopedGroup(tenantId: string, groupId: string) {
  return db.group.findFirst({
    where: {
      id: groupId,
      tenantId,
      isActive: true,
    },
  })
}

async function ensureUniqueStudentPhone(
  tenantId: string,
  phone: string | undefined,
  currentStudentId?: string,
) {
  if (!phone) {
    return
  }

  const existingUser = await db.user.findFirst({
    where: {
      tenantId,
      phone,
      ...(currentStudentId
        ? {
            id: {
              not: currentStudentId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    throw new Error('رقم الهاتف مستخدم بالفعل داخل نفس المؤسسة')
  }
}

async function upsertStudentEnrollment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  studentId: string,
  groupId: string,
) {
  const [group, existingEnrollment] = await Promise.all([
    tx.group.findFirst({
      where: {
        id: groupId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        maxCapacity: true,
      },
    }),
    tx.groupStudent.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    }),
  ])

  if (!group) {
    throw new Error('المجموعة غير موجودة')
  }

  const activeEnrollmentCount = await tx.groupStudent.count({
    where: {
      groupId,
      status: EnrollmentStatus.ACTIVE,
      group: {
        tenantId,
      },
      student: {
        tenantId,
        role: PrismaUserRole.STUDENT,
      },
      ...(existingEnrollment?.status === EnrollmentStatus.ACTIVE
        ? {
            studentId: {
              not: studentId,
            },
          }
        : {}),
    },
  })

  const nextStatus =
    activeEnrollmentCount >= group.maxCapacity
      ? EnrollmentStatus.WAITLIST
      : EnrollmentStatus.ACTIVE

  if (existingEnrollment) {
    return tx.groupStudent.update({
      where: {
        id: existingEnrollment.id,
      },
      data: {
        status: nextStatus,
        droppedAt: null,
      },
    })
  }

  return tx.groupStudent.create({
    data: {
      groupId,
      studentId,
      status: nextStatus,
    },
  })
}

function getImportErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return 'فشل الحفظ بسبب بيانات مكررة'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'حدث خطأ غير متوقع أثناء الاستيراد'
}

export async function createStudent(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  const data = parseStudentFormData(formData)

  await ensureUniqueStudentPhone(tenant.id, data.phone)

  const result = await db.$transaction(async (tx) => {
    const student = await tx.user.create({
      data: {
        tenantId: tenant.id,
        role: PrismaUserRole.STUDENT,
        name: data.name,
        phone: getStoredStudentPhone(data.phone),
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        gradeLevel: data.gradeLevel,
      },
    })

    const enrollment = data.groupId
      ? await upsertStudentEnrollment(tx, tenant.id, student.id, data.groupId)
      : null

    return {
      student,
      enrollment,
    }
  })

  revalidateStudentPages(result.student.id, data.groupId)

  return result
}

export async function updateStudent(studentId: string, formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  const existingStudent = await getScopedStudent(tenant.id, studentId)

  if (!existingStudent) {
    throw new Error('الطالب غير موجود')
  }

  const data = parseStudentFormData(formData)

  await ensureUniqueStudentPhone(tenant.id, data.phone, existingStudent.id)

  const result = await db.$transaction(async (tx) => {
    const student = await tx.user.update({
      where: {
        id: existingStudent.id,
      },
      data: {
        name: data.name,
        phone: getStoredStudentPhone(data.phone, existingStudent.phone),
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        gradeLevel: data.gradeLevel,
      },
    })

    const enrollment = data.groupId
      ? await upsertStudentEnrollment(tx, tenant.id, student.id, data.groupId)
      : null

    return {
      student,
      enrollment,
    }
  })

  revalidateStudentPages(existingStudent.id, data.groupId)

  return result
}

export async function enrollInGroup(studentId: string, groupId: string) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  const [student, group] = await Promise.all([
    getScopedStudent(tenant.id, studentId),
    getScopedGroup(tenant.id, groupId),
  ])

  if (!student) {
    throw new Error('الطالب غير موجود')
  }

  if (!group) {
    throw new Error('المجموعة غير موجودة')
  }

  const enrollment = await db.$transaction((tx) =>
    upsertStudentEnrollment(tx, tenant.id, student.id, group.id),
  )

  revalidateStudentPages(student.id, group.id)

  return enrollment
}

export async function removeFromGroup(studentId: string, groupId: string) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  const enrollment = await db.groupStudent.findFirst({
    where: {
      studentId,
      groupId,
      group: {
        tenantId: tenant.id,
      },
      student: {
        tenantId: tenant.id,
        role: PrismaUserRole.STUDENT,
      },
    },
  })

  if (!enrollment) {
    throw new Error('الطالب غير مسجل في هذه المجموعة')
  }

  const updatedEnrollment = await db.groupStudent.update({
    where: {
      id: enrollment.id,
    },
    data: {
      status: EnrollmentStatus.DROPPED,
      droppedAt: new Date(),
    },
  })

  revalidateStudentPages(studentId, groupId)

  return updatedEnrollment
}

export async function bulkImport(
  tenantId: string,
  records: Record<string, unknown>[],
) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  if (tenant.id !== tenantId) {
    throw new Error('بيانات المؤسسة غير متطابقة مع الجلسة الحالية')
  }

  const results: Array<{
    index: number
    success: boolean
    studentId?: string
    error?: string
  }> = []

  for (const [index, record] of records.entries()) {
    let parsedRecord: StudentCreateInput

    try {
      parsedRecord = parseStudentImportRecord(record)
      await ensureUniqueStudentPhone(tenant.id, parsedRecord.phone)

      const createdStudent = await db.$transaction(async (tx) => {
        const student = await tx.user.create({
          data: {
            tenantId: tenant.id,
            role: PrismaUserRole.STUDENT,
            name: parsedRecord.name,
            phone: getStoredStudentPhone(parsedRecord.phone),
            parentName: parsedRecord.parentName,
            parentPhone: parsedRecord.parentPhone,
            gradeLevel: parsedRecord.gradeLevel,
          },
        })

        if (parsedRecord.groupId) {
          await upsertStudentEnrollment(
            tx,
            tenant.id,
            student.id,
            parsedRecord.groupId,
          )
        }

        return student
      })

      results.push({
        index,
        success: true,
        studentId: createdStudent.id,
      })
    } catch (error) {
      results.push({
        index,
        success: false,
        error: getImportErrorMessage(error),
      })
    }
  }

  revalidateStudentPages()

  return {
    total: records.length,
    created: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  }
}
