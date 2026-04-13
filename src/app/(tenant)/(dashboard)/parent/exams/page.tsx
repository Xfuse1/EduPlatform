export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { ParentExams } from "@/modules/dashboard/components/ParentExams";
import { getParentExamReports } from "@/modules/exams/queries";

export const metadata = {
  title: "الامتحانات والتقييمات | EduPlatform",
};

export default async function ParentExamsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "PARENT") {
    redirect(user.role === "STUDENT" ? "/student" : "/teacher");
  }

  const examReports = await getParentExamReports(tenant.id, user.id);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">الامتحانات والتقييمات</h1>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          تابع مستوى وتطور أبنائك من خلال درجات الامتحانات والتقييمات.
        </p>
      </div>
      <ParentExams data={examReports} />
    </div>
  );
}
