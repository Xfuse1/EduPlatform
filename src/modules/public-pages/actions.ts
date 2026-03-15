'use server'

import { EnrollmentStatus, UserRole } from '@prisma/client'

import { db } from '@/lib/db'

import {
  publicRegistrationSchema,
  type PublicRegistrationInput,
} from './validations'

async function ensureUniqueStudentPhone(tenantId: string, phone: string) {
  const existingUser = await db.user.findFirst({
    where: {
      tenantId,
      phone,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    throw new Error('رقم الهاتف مستخدم بالفعل داخل المؤسسة')
  }
}

export async function registerStudent(
  tenantId: string,
  input: PublicRegistrationInput | Record<string, unknown>,
) {
  const data = publicRegistrationSchema.parse(input)

  await ensureUniqueStudentPhone(tenantId, data.phone)

  const result = await db.$transaction(async (tx) => {
    const group = await tx.group.findFirst({
      where: {
        id: data.groupId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        maxCapacity: true,
      },
    })

    if (!group) {
      throw new Error('المجموعة المختارة غير متاحة الآن')
    }

    const activeEnrollmentCount = await tx.groupStudent.count({
      where: {
        groupId: group.id,
        status: EnrollmentStatus.ACTIVE,
        group: {
          tenantId,
        },
        student: {
          tenantId,
          role: UserRole.STUDENT,
        },
      },
    })

    const student = await tx.user.create({
      data: {
        tenantId,
        role: UserRole.STUDENT,
        name: data.name,
        phone: data.phone,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        gradeLevel: data.gradeLevel,
      },
    })

    const enrollment = await tx.groupStudent.create({
      data: {
        groupId: group.id,
        studentId: student.id,
        status:
          activeEnrollmentCount >= group.maxCapacity
            ? EnrollmentStatus.WAITLIST
            : EnrollmentStatus.ACTIVE,
      },
    })

    return {
      student,
      enrollment,
    }
  })

  return result
}
