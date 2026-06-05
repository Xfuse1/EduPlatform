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

  // Map the Prisma result into the shape ExamResultsClient expects. The only
  // structural gap is the JSON `answers`/`options` fields, which we narrow here
  // instead of leaking an `as any` across the boundary.
  const examData = {
    id: exam.id,
    title: exam.title,
    questions: exam.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      type: question.type as "MCQ" | "ESSAY" | "TRUE_FALSE",
      options: question.options,
      correctAnswer: question.correctAnswer,
      grade: question.grade,
    })),
    submissions: exam.submissions.map((submission) => ({
      id: submission.id,
      studentId: submission.studentId,
      answers: (submission.answers ?? {}) as Record<string, string>,
      totalGrade: submission.totalGrade,
      aiGrade: submission.aiGrade,
      aiFeedback: submission.aiFeedback,
      teacherComment: submission.teacherComment,
      gradedByAi: submission.gradedByAi,
      submittedAt: submission.submittedAt,
      student: submission.student,
    })),
  };

  return <ExamResultsClient exam={examData} />;
}
