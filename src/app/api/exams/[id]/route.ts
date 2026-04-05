import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { title, description, groupId, startAt, duration, maxGrade, questions } = await req.json();

    // 1. Update the exam basic info
    // 2. We handle questions by deleting old ones and creating new ones, 
    //    or updating if they have IDs. For simplicity in a small app, 
    //    re-creating or using upsert is common.
    // Here we'll delete and re-create to keep it simple as requested for the UI update.

    const exam = await db.$transaction(async (tx) => {
        // Delete old questions
        await tx.examQuestion.deleteMany({
            where: { examId: id }
        });

        return await tx.exam.update({
            where: { id, tenantId: user.tenantId },
            data: {
                title,
                description,
                groupId,
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
            include: {
                questions: true,
            }
        });
    });

    return NextResponse.json(exam);
  } catch (error) {
    console.error("[EXAM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await db.examQuestion.deleteMany({
        where: { examId: id }
    });

    await db.exam.delete({
      where: { id, tenantId: user.tenantId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[EXAM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
