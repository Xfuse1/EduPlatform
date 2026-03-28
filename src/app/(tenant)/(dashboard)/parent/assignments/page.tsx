import { MOCK_TENANT } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth";
import { getParentDashboardData } from "@/modules/dashboard/queries";
import { ParentAssignments } from "@/modules/dashboard/components/ParentAssignments";
import { redirect } from "next/navigation";

export const metadata = {
  title: "متابعة الواجبات | EduPlatform",
};

export default async function ParentAssignmentsPage() {
  const session = await getCurrentUser();

  if (!session || session.role !== "PARENT") {
    redirect("/login");
  }

  const data = await getParentDashboardData(MOCK_TENANT.id, session.userId);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">الواجبات</h1>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          تابع الواجبات المطلوبة من أبنائك وحالتها.
        </p>
      </div>
      <ParentAssignments data={data?.assignments || []} />
    </div>
  );
}
