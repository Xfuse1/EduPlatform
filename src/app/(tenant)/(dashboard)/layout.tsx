export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/client";

import { AppShell } from "@/components/layout/AppShell";
import { TenantSuspendedNotice } from "@/components/layout/TenantSuspendedNotice";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyActiveSubscription } from "@/modules/payments/providers/subscription";

function normalizeRole(role: UserRole) {
  if (role === "SUPER_ADMIN") return "super_admin";
  if (role === "CENTER_ADMIN" || role === "ADMIN" || role === "MANAGER") return "teacher";
  if (role === "STUDENT") return "student";
  if (role === "PARENT") return "parent";
  return "teacher";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const headerStore = await headers();
  const currentPath = headerStore.get("next-url") ?? "";
  const role = normalizeRole(user.role);

  if (role === "super_admin") {
    redirect("/admin");
  }

  if (currentPath.includes("/teacher") && role !== "teacher") {
    redirect(role === "student" ? "/student" : "/parent");
  }

  if (currentPath.includes("/student") && role !== "student") {
    redirect(role === "teacher" ? "/teacher" : "/parent");
  }

  if (currentPath.includes("/parent") && role !== "parent") {
    redirect(role === "teacher" ? "/teacher" : "/student");
  }

  // Use user's actual tenantId to get the correct tenant (avoids localhost first-tenant fallback bug)
  const [userTenant, userData, adminContact] = await Promise.all([
    db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, slug: true, isActive: true },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    }),
    db.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
      select: { phone: true },
    }),
  ]);

  const tenantName = userTenant?.name ?? "EduPlatform";
  const tenantSlug = userTenant?.slug;
  const avatarUrl = userData?.avatarUrl ?? null;

  if (userTenant && !userTenant.isActive) {
    return (
      <AppShell
        currentPath={currentPath}
        role={role}
        tenantName={tenantName}
        tenantSlug={tenantSlug}
        userName={user.name}
        avatarUrl={avatarUrl}
        hasSubscription={false}
      >
        <TenantSuspendedNotice tenantName={tenantName} adminPhone={adminContact?.phone ?? null} />
      </AppShell>
    );
  }

  const hasSubscription = role === "teacher" ? await verifyActiveSubscription() : true;

  return (
    <AppShell
      currentPath={currentPath}
      role={role}
      tenantName={tenantName}
      tenantSlug={tenantSlug}
      userName={user.name}
      avatarUrl={avatarUrl}
      hasSubscription={hasSubscription}
    >
      {children}
    </AppShell>
  );
}
