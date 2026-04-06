import type { SessionUser } from "@/lib/auth";
import type { ResolvedTenant } from "@/lib/tenant";

export function isCenterOwner(_tenant: ResolvedTenant, user: SessionUser) {
  return user.role === "CENTER_ADMIN";
}

export function canManageTeacherAccounts(_tenant: ResolvedTenant, user: SessionUser) {
  return user.role === "CENTER_ADMIN" || user.role === "ASSISTANT";
}

export function getTeacherScopeUserId(_tenant: ResolvedTenant, user: SessionUser) {
  if (user.role === "CENTER_ADMIN" || user.role === "ASSISTANT") {
    return null;
  }

  if (user.role !== "TEACHER") {
    return null;
  }

  return user.id;
}