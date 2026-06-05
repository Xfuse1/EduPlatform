import type { UserRole } from '@/generated/client'

export class PermissionError extends Error {
  constructor(message = 'ليس لديك صلاحية') {
    super(message)
    this.name = 'PermissionError'
  }
}

/** Roles allowed to manage center/teacher operational data (students, groups, attendance, payments). */
export const STAFF_ROLES = ['CENTER_ADMIN', 'ADMIN', 'MANAGER', 'TEACHER', 'ASSISTANT'] as const
/** Center-owner / administrative roles (no plain TEACHER). */
export const CENTER_ADMIN_ROLES = ['CENTER_ADMIN', 'ADMIN', 'MANAGER'] as const
/** Platform-level super admins. */
export const PLATFORM_ADMIN_ROLES = ['SUPER_ADMIN'] as const

export function checkRole(
  role: UserRole,
  allowedRoles: readonly UserRole[],
) {
  return allowedRoles.includes(role)
}

export function requireRole(
  role: UserRole,
  allowedRoles: readonly UserRole[],
  message?: string,
) {
  if (!checkRole(role, allowedRoles)) {
    throw new PermissionError(message)
  }
}
