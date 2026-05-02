export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getGradeLevelKey } from "@/lib/grade-levels";
import { StudentDashboard } from "@/modules/dashboard/components/StudentDashboard";
import { getStudentDashboardData } from "@/modules/dashboard/queries";
import { getPublicGroups } from "@/modules/public-pages/queries";

export default async function StudentDashboardPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const [data, allGroups, pendingEnrollments] = await Promise.all([
    getStudentDashboardData(tenant.id, user.id),
    getPublicGroups(tenant.id),
    db.groupStudent.findMany({
      where: {
        studentId: user.id,
        status: { in: ["PENDING", "WAITLIST"] },
        group: { tenantId: tenant.id },
      },
      select: { groupId: true },
    }),
  ]);

  const pendingGroupIds = pendingEnrollments.map((e) => e.groupId);

  const studentGradeLevelKey = getGradeLevelKey(data.profile?.student?.gradeLevel ?? "");
  const availableGroups = studentGradeLevelKey
    ? allGroups.filter((g) => getGradeLevelKey(g.gradeLevel) === studentGradeLevelKey)
    : allGroups;

  return (
    <StudentDashboard 
      data={data} 
      availableGroups={availableGroups} 
      pendingGroupIds={pendingGroupIds} 
    />
  );
}

