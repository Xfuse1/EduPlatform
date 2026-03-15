'use server'

import { EnrollmentStatus, Prisma, type UserRole, UserRole as PrismaUserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'

import { parseStudentFormData, parseStudentImportRecord } from './validations'

const MANAGE_STUDENT_ROLES: UserRole[] = ['TEACHER', 'ASSISTANT']
const ACTIVE_ENROLLMENT_STATUSES = [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST]

function assertCanManageStudents(role: UserRole) {
  if (!MANAGE_STUDENT_ROLES.includes(role)) {
    throw new Error('ليس لديك صلاحية لإدارة الطلاب')
  }
}

function revalidateStudentPages(studentId?: string, groupIds: string[] = []) {
  revalidatePath(ROUTES.teacher.students)
  revalidatePath(ROUTES.teacher.newStudent)
  revalidatePath(ROUTES.teacher.importStudents)

  if (studentId) {
    revalidatePath(`${ROUTES.teacher.students}/${studentId}`)
  }

  revalidatePath(ROUTES.teacher.groups)

  for (const groupId of groupIds) {
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

async function ensureUniqueStudentPhone(
  tenantId: string,
  phone: string,
  currentStudentId?: string,
) {
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

async function getActiveEnrollmentGroupIds(tenantId: string, studentId: string) {
  const enrollments = await db.groupStudent.findMany({
    where: {
      studentId,
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
      group: {
        tenantId,
      },
    },
    select: {
      groupId: true,
    },
  })

  return enrollments.map((enrollment) => enrollment.groupId)
}

async function syncStudentEnrollments(
  tx: Prisma.TransactionClient,
  tenantId: string,
  studentId: string,
  groupIds: string[],
) {
  const uniqueGroupIds = [...new Set(groupIds)]

  const [targetGroups, existingEnrollments] = await Promise.all([
    uniqueGroupIds.length > 0
      ? tx.group.findMany({
          where: {
            tenantId,
            isActive: true,
            id: {
              in: uniqueGroupIds,
            },
          },
          select: {
            id: true,
            maxCapacity: true,
          },
        })
      : Promise.resolve([]),
    tx.groupStudent.findMany({
      where: {
        studentId,
        group: {
          tenantId,
        },
      },
      select: {
        id: true,
        groupId: true,
        status: true,
      },
    }),
  ])

  if (targetGroups.length !== uniqueGroupIds.length) {
    throw new Error('إحدى المجموعات المطلوبة غير موجودة أو غير نشطة')
  }

  const existingEnrollmentMap = new Map(
    existingEnrollments.map((enrollment) => [enrollment.groupId, enrollment]),
  )

  for (const group of targetGroups) {
    const existingEnrollment = existingEnrollmentMap.get(group.id)

    const activeEnrollmentCount = await tx.groupStudent.count({
      where: {
        groupId: group.id,
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
      await tx.groupStudent.update({
        where: {
          id: existingEnrollment.id,
        },
        data: {
          status: nextStatus,
          droppedAt: null,
        },
      })
      continue
    }

    await tx.groupStudent.create({
      data: {
        groupId: group.id,
        studentId,
        status: nextStatus,
      },
    })
  }

  const groupIdsToDrop = existingEnrollments
    .filter(
      (enrollment) =>
        !uniqueGroupIds.includes(enrollment.groupId) &&
        enrollment.status !== EnrollmentStatus.DROPPED,
    )
    .map((enrollment) => enrollment.id)

  if (groupIdsToDrop.length > 0) {
    await tx.groupStudent.updateMany({
      where: {
        id: {
          in: groupIdsToDrop,
        },
      },
      data: {
        status: EnrollmentStatus.DROPPED,
        droppedAt: new Date(),
      },
    })
  }
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
        phone: data.phone,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        gradeLevel: data.gradeLevel,
      },
    })

    if (data.syncGroups) {
      await syncStudentEnrollments(tx, tenant.id, student.id, data.groupIds)
    }

    return student
  })

  revalidateStudentPages(result.id, data.groupIds)

  return {
    student: result,
    groupIds: data.groupIds,
  }
}

export async function updateStudent(studentId: string, formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  const existingStudent = await getScopedStudent(tenant.id, studentId)

  if (!existingStudent) {
    throw new Error('الطالب غير موجود')
  }

  const currentGroupIds = await getActiveEnrollmentGroupIds(tenant.id, existingStudent.id)
  const data = parseStudentFormData(formData)

  await ensureUniqueStudentPhone(tenant.id, data.phone, existingStudent.id)

  const result = await db.$transaction(async (tx) => {
    const student = await tx.user.update({
      where: {
        id: existingStudent.id,
      },
      data: {
        name: data.name,
        phone: data.phone,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        gradeLevel: data.gradeLevel,
      },
    })

    if (data.syncGroups) {
      await syncStudentEnrollments(tx, tenant.id, student.id, data.groupIds)
    }

    return student
  })

  revalidateStudentPages(
    existingStudent.id,
    data.syncGroups ? [...new Set([...currentGroupIds, ...data.groupIds])] : currentGroupIds,
  )

  return {
    student: result,
    groupIds: data.syncGroups ? data.groupIds : currentGroupIds,
  }
}

export async function syncStudentGroups(studentId: string, groupIds: string[]) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageStudents(user.role)

  const student = await getScopedStudent(tenant.id, studentId)

  if (!student) {
    throw new Error('الطالب غير موجود')
  }

  const currentGroupIds = await getActiveEnrollmentGroupIds(tenant.id, student.id)

  await db.$transaction((tx) =>
    syncStudentEnrollments(tx, tenant.id, student.id, groupIds),
  )

  revalidateStudentPages(student.id, [...new Set([...currentGroupIds, ...groupIds])])

  return {
    studentId: student.id,
    groupIds,
  }
}

export async function enrollInGroup(studentId: string, groupId: string) {
  const tenant = await requireTenant()
  const currentGroupIds = await getActiveEnrollmentGroupIds(tenant.id, studentId)

  if (currentGroupIds.includes(groupId)) {
    return {
      studentId,
      groupIds: currentGroupIds,
    }
  }

  return syncStudentGroups(studentId, [...currentGroupIds, groupId])
}

export async function removeFromGroup(studentId: string, groupId: string) {
  const tenant = await requireTenant()
  const currentGroupIds = await getActiveEnrollmentGroupIds(tenant.id, studentId)

  if (!currentGroupIds.includes(groupId)) {
    throw new Error('الطالب غير مسجل في هذه المجموعة')
  }

  return syncStudentGroups(
    studentId,
    currentGroupIds.filter((currentGroupId) => currentGroupId !== groupId),
  )
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
    try {
      const parsedRecord = parseStudentImportRecord(record)
      await ensureUniqueStudentPhone(tenant.id, parsedRecord.phone)

      const createdStudent = await db.$transaction(async (tx) => {
        const student = await tx.user.create({
          data: {
            tenantId: tenant.id,
            role: PrismaUserRole.STUDENT,
            name: parsedRecord.name,
            phone: parsedRecord.phone,
            parentName: parsedRecord.parentName,
            parentPhone: parsedRecord.parentPhone,
            gradeLevel: parsedRecord.gradeLevel,
          },
        })

        await syncStudentEnrollments(tx, tenant.id, student.id, parsedRecord.groupIds)

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
