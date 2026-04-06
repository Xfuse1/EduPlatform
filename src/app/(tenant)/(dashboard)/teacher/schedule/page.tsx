export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { SchedulePageClient } from "@/modules/schedule/components/SchedulePageClient";

export default async function TeacherSchedulePage() {
  const user = await requireAuth();
  const tenant = await requireTenant();
  
  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySessions = await db.session.findMany({
    where: { tenantId: tenant.id, date: today },
    include: { group: { include: { groupStudents: true } } }
  });

  const upcomingExams = await db.exam.findMany({
    where: { tenantId: tenant.id, startAt: { gte: today } },
    orderBy: { startAt: 'asc' },
    take: 5
  });

  const pendingHomework = await db.assignmentSubmission.findMany({
    where: { 
      assignment: { tenantId: tenant.id },
      grade: null
    },
    include: { student: true, assignment: true },
    take: 10
  });

  return (
    <SchedulePageClient 
      todaySessions={todaySessions} 
      upcomingExams={upcomingExams} 
      pendingHomework={pendingHomework} 
    />
  );
}
