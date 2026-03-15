export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";

function normalizeRole(role: "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT") {
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

  if (currentPath.includes("/teacher") && role !== "teacher") {
    redirect(role === "student" ? "/student" : "/parent");
  }

  if (currentPath.includes("/student") && role !== "student") {
    redirect(role === "teacher" ? "/teacher" : "/parent");
  }

  if (currentPath.includes("/parent") && role !== "parent") {
    redirect(role === "teacher" ? "/teacher" : "/student");
  }

  return (
    <AppShell currentPath={currentPath} role={role} tenantName={tenant.name}>
      {children}
    </AppShell>
  );
}
