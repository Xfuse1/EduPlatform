import type { UserRole } from '@/generated/client'

export class PermissionError extends Error {
  constructor(message = 'ليس لديك صلاحية') {
    super(message)
    this.name = 'PermissionError'
  }
}

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
