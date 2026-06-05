import type { UserRole } from '@/generated/client'

import { ROUTES } from '@/config/routes'

export function getDashboardRouteForRole(role: UserRole) {
  switch (role) {
    case 'SUPER_ADMIN':
      return ROUTES.admin.dashboard
    case 'CENTER_ADMIN':
    case 'ADMIN':
    case 'MANAGER':
      return ROUTES.center.dashboard
    case 'TEACHER':
    case 'ASSISTANT':
      return ROUTES.teacher.dashboard
    case 'STUDENT':
      return ROUTES.student.dashboard
    case 'PARENT':
      return ROUTES.parent.dashboard
    default:
      return ROUTES.teacher.dashboard
  }
}
