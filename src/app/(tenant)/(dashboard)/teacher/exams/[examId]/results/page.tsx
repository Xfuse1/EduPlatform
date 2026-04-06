export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExamResultsClient } from "@/modules/exams/components/ExamResultsClient";

export default async function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const user = await requireAuth();

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      submissions: {
        include: {
          student: { select: { id: true, name: true, phone: true } }
        }
      }
    }
  });

  if (!exam) return <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100">الامتحان غير موجود</div>;

  return <ExamResultsClient exam={exam as any} />;
}
