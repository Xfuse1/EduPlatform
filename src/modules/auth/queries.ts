import type { UserRole } from '@prisma/client'

import { ROUTES } from '@/config/routes'
import { db } from '@/lib/db'

export async function findAuthUserByPhone(tenantId: string, phone: string) {
  return db.user.findFirst({
    where: {
      tenantId,
      phone,
      isActive: true,
    },
  })
}

export async function getLatestActiveOtp(phone: string) {
  return db.oTP.findFirst({
    where: {
      phone,
      used: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export function getDashboardRouteForRole(role: UserRole) {
  switch (role) {
    case 'TEACHER':
    case 'ASSISTANT':
      return ROUTES.teacher.dashboard
    case 'STUDENT':
      return ROUTES.student.dashboard
    case 'PARENT':
      return ROUTES.parent.dashboard
  }
}
