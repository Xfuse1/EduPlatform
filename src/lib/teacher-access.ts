import type { SessionUser } from "@/lib/auth";
import type { ResolvedTenant } from "@/lib/tenant";

export function isCenterOwner(tenant: ResolvedTenant, user: SessionUser) {
  return tenant.accountType === "CENTER" && user.role === "CENTER_ADMIN";
}

export function canManageTeacherAccounts(tenant: ResolvedTenant, user: SessionUser) {
  if (tenant.accountType !== "CENTER") {
    return false;
  }

  if (user.role === "CENTER_ADMIN") {
    return true;
  }

  if (user.role === "ASSISTANT") {
    return true;
  }

  return false;
}

export function getTeacherScopeUserId(tenant: ResolvedTenant, user: SessionUser) {
  if (tenant.accountType !== "CENTER") {
    return null;
  }

  if (user.role === "CENTER_ADMIN" || user.role === "ASSISTANT") {
    return null;
  }

  if (user.role !== "TEACHER") {
    return null;
  }

  return user.id;
}
