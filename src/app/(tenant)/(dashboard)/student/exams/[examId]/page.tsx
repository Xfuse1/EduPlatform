export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExamTakingClient } from "@/modules/exams/components/ExamTakingClient";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const user = await requireAuth();
  if (user.role !== "STUDENT") redirect("/teacher");

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { order: 'asc' } } }
  });

  if (!exam) redirect("/student/exams");

  const existingSubmission = await db.examSubmission.findFirst({
    where: { examId, studentId: user.id }
  });
  if (existingSubmission) redirect("/student/exams");

  return <ExamTakingClient exam={exam as any} studentId={user.id} />;
}
