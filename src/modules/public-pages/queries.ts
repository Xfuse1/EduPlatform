import { EnrollmentStatus, UserRole } from '@prisma/client'

import { db } from '@/lib/db'

export async function getPublicTenantProfile(tenantId: string) {
  return db.tenant.findUnique({
    where: {
      id: tenantId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      bio: true,
      logoUrl: true,
      themeColor: true,
      region: true,
      subjects: true,
    },
  })
}

export async function getPublicGroups(tenantId: string) {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: [
      { subject: 'asc' },
      { gradeLevel: 'asc' },
      { name: 'asc' },
    ],
    include: {
      students: {
        where: {
          status: EnrollmentStatus.ACTIVE,
          student: {
            tenantId,
            role: UserRole.STUDENT,
            isActive: true,
          },
        },
        select: {
          id: true,
        },
      },
    },
  })

  return groups.map(({ students, ...group }) => ({
    ...group,
    studentCount: students.length,
  }))
}
