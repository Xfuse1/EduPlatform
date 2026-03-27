export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeacherAccounts } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";

function normalizeRole(role: "CENTER_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT") {
  if (role === "CENTER_ADMIN") return "center";
  if (role === "STUDENT") return "student";
  if (role === "PARENT") return "parent";
  return "teacher";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const headerStore = await headers();
  const currentPath = headerStore.get("next-url") ?? "";
  const role = normalizeRole(user.role);
  const canManageTeachers = canManageTeacherAccounts(tenant, user);
  const tenantLabel = tenant.accountType === "CENTER" ? "اسم السنتر" : "اسم الحساب";

  if (currentPath.includes("/center") && role !== "center") {
    redirect(role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/parent");
  }

  if (currentPath.includes("/teacher") && role !== "teacher") {
    redirect(role === "center" ? "/center" : role === "student" ? "/student" : "/parent");
  }

  if (currentPath.includes("/student") && role !== "student") {
    redirect(role === "center" ? "/center" : role === "teacher" ? "/teacher" : "/parent");
  }

  if (currentPath.includes("/parent") && role !== "parent") {
    redirect(role === "center" ? "/center" : role === "teacher" ? "/teacher" : "/student");
  }

  if (currentPath.includes("/teacher/teachers") && !canManageTeachers) {
    redirect("/teacher");
  }

  return (
    <AppShell
      canManageTeachers={canManageTeachers}
      currentPath={currentPath}
      role={role}
      tenantLabel={tenantLabel}
      tenantName={tenant.name}
      userName={user.name}
    >
      {children}
    </AppShell>
  );
}
