export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getAssignmentsByParent } from "@/modules/assignments/queries";
import { ParentAssignments } from "@/modules/dashboard/components/ParentAssignments";

export const metadata = {
  title: "متابعة الواجبات | EduPlatform",
};

export default async function ParentAssignmentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "PARENT") {
    redirect(user.role === "STUDENT" ? "/student" : "/teacher");
  }

  const data = await getAssignmentsByParent(tenant.id, user.id);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">الواجبات</h1>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          تابع الواجبات المطلوبة من أبنائك وحالتها.
        </p>
      </div>
      <ParentAssignments data={data ?? []} />
    </div>
  );
}
