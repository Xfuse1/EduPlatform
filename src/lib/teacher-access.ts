import type { SessionUser } from "@/lib/auth";
import type { ResolvedTenant } from "@/lib/tenant";

export function isCenterOwner(tenant: ResolvedTenant, user: SessionUser) {
  return tenant.accountType === "CENTER" && user.role === "TEACHER" && Boolean(tenant.phone) && tenant.phone === user.phone;
}

export function canManageTeacherAccounts(tenant: ResolvedTenant, user: SessionUser) {
  if (tenant.accountType !== "CENTER") {
    return false;
  }

  if (user.role === "ASSISTANT") {
    return true;
  }

  return isCenterOwner(tenant, user);
}

export function getTeacherScopeUserId(tenant: ResolvedTenant, user: SessionUser) {
  if (tenant.accountType !== "CENTER") {
    return null;
  }

  if (user.role !== "TEACHER") {
    return null;
  }

  return isCenterOwner(tenant, user) ? null : user.id;
}
