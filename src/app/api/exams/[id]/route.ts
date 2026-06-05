import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRole, STAFF_ROLES } from "@/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!checkRole(user.role, STAFF_ROLES)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { title, description, groupId, startAt, duration, maxGrade, questions } = await req.json();

    const isTeacher = user.role === "TEACHER";

    // Verify the exam belongs to this tenant (and teacher when scoped) before mutating.
    const existingExam = await db.exam.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        ...(isTeacher ? { group: { teacherId: user.id } } : {}),
      },
      select: { id: true },
    });
    if (!existingExam) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Validate any new target group belongs to this tenant (and teacher when scoped).
    if (groupId) {
      const group = await db.group.findFirst({
        where: {
          id: groupId,
          tenantId: user.tenantId,
          ...(isTeacher ? { teacherId: user.id } : {}),
        },
        select: { id: true },
      });
      if (!group) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // 1. Update the exam basic info
    // 2. We handle questions by deleting old ones and creating new ones,
    //    or updating if they have IDs. For simplicity in a small app,
    //    re-creating or using upsert is common.
    // Here we'll delete and re-create to keep it simple as requested for the UI update.

    const exam = await db.$transaction(async (tx) => {
        // Delete old questions (scoped through the tenant-verified exam).
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
  if (!checkRole(user.role, STAFF_ROLES)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const isTeacher = user.role === "TEACHER";

    // Verify the exam belongs to this tenant (and teacher when scoped) before deleting.
    const existingExam = await db.exam.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        ...(isTeacher ? { group: { teacherId: user.id } } : {}),
      },
      select: { id: true },
    });
    if (!existingExam) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Questions are removed via schema cascade (ExamQuestion.exam onDelete: Cascade).
    await db.exam.delete({
      where: { id, tenantId: user.tenantId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[EXAM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
