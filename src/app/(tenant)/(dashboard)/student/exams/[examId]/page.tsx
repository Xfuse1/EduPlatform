export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { ExamTakingClient } from "@/modules/exams/components/ExamTakingClient";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const user = await requireAuth();
  if (user.role !== "STUDENT") redirect("/teacher");

  const tenant = await requireTenant();

  // Scope to the student's tenant and active enrollment in the exam's group.
  // NOTE: correctAnswer is intentionally EXCLUDED from the select.
  const exam = await db.exam.findFirst({
    where: {
      id: examId,
      tenantId: tenant.id,
      group: { groupStudents: { some: { studentId: user.id, status: "ACTIVE" } } },
    },
    include: {
      questions: {
        select: {
          id: true,
          type: true,
          questionText: true,
          options: true,
          grade: true,
          order: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!exam) notFound();

  const existingSubmission = await db.examSubmission.findFirst({
    where: { examId, studentId: user.id }
  });
  if (existingSubmission) redirect("/student/exams");

  // Build a sanitized object (no correctAnswer reaches the client).
  const sanitizedExam = {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    duration: exam.duration,
    questions: exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      grade: q.grade,
    })),
  };

  return <ExamTakingClient exam={sanitizedExam as any} studentId={user.id} />;
}
