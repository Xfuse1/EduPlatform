import { redirect } from "next/navigation";

import { requireAuth, UnauthorizedError, type SessionUser } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";

export function isSuperAdmin(user: Pick<SessionUser, "role"> | null | undefined) {
  return user?.role === "SUPER_ADMIN";
}

export async function requireSuperAdminPage() {
  const user = await requireAuth();

  if (!isSuperAdmin(user)) {
    redirect("/");
  }

  return user;
}

export async function requireSuperAdminApi(request: unknown) {
  const user = await requireAuth(request);

  if (!isSuperAdmin(user)) {
    throw new PermissionError("ليس لديك صلاحية السوبر أدمن");
  }

  return user;
}

export function toAdminApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return { code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول", status: 401 };
  }

  if (error instanceof PermissionError) {
    return { code: "FORBIDDEN", message: error.message, status: 403 };
  }

  return {
    code: "ADMIN_API_ERROR",
    message: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    status: 500,
  };
}

