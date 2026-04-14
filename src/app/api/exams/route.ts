import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { title, description, groupId, startAt, duration, maxGrade, questions } =
      await req.json();

    const exam = await db.exam.create({
      data: {
        tenantId: user.tenantId,
        groupId,
        title,
        description,
        startAt: new Date(startAt),
        duration,
        maxGrade: maxGrade || 100,
        questions: {
          create: questions.map((q: any, i: number) => ({
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            grade: q.grade || 10,
            order: i,
          })),
        },
      },
      include: { questions: true },
    });

    const students = await db.groupStudent.findMany({
      where: { groupId, status: "ACTIVE" },
      select: { studentId: true },
    });

    if (students.length > 0) {
      await db.notification.createMany({
        data: students.map((s) => ({
          tenantId: user.tenantId,
          userId: s.studentId,
          type: "EXAM_PUBLISHED" as const,
          message: `📝 تم نشر امتحان جديد: ${title}`,
          channel: "PUSH" as const,
          status: "QUEUED" as const,
          recipientPhone: "",
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("[EXAMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
