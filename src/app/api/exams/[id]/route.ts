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

    // Re-creating questions assigns new ids; existing ExamSubmission.answers are
    // keyed by the old question ids, so editing questions after students have
    // submitted would orphan every answer reference and corrupt grading/results.
    // Block question edits once any submission exists; metadata edits stay allowed.
    if (Array.isArray(questions)) {
      const submissionCount = await db.examSubmission.count({ where: { examId: id } });
      if (submissionCount > 0) {
        return new NextResponse(
          "Cannot edit exam questions after students have submitted answers.",
          { status: 409 }
        );
      }
    }

    // Delete old questions and re-create them (only reached when no submissions exist).
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
