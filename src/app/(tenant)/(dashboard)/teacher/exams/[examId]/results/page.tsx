export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { checkRole, STAFF_ROLES } from "@/lib/permissions";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { db } from "@/lib/db";
import { ExamResultsClient } from "@/modules/exams/components/ExamResultsClient";

export default async function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const user = await requireAuth();
  const tenant = await requireTenant();

  if (!checkRole(user.role, STAFF_ROLES)) notFound();

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

  const exam = await db.exam.findFirst({
    where: {
      id: examId,
      tenantId: tenant.id,
      ...(teacherScopeUserId ? { group: { teacherId: teacherScopeUserId } } : {}),
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
      submissions: {
        include: {
          student: { select: { id: true, name: true, phone: true } }
        }
      }
    }
  });

  if (!exam) notFound();

  return <ExamResultsClient exam={exam as any} />;
}
