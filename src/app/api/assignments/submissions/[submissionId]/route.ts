import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const user = await requireAuth();
    if (!["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { submissionId } = await params;
    const body = await req.json();
    const { grade, note } = body;

    const isTeacher = user.role === "TEACHER";

    // Verify the submission belongs to this tenant (and teacher when scoped) before updating.
    const existing = await db.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: {
        assignment: {
          select: { tenantId: true, maxGrade: true, group: { select: { teacherId: true } } },
        },
      },
    });

    if (!existing || existing.assignment.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (isTeacher && existing.assignment.group.teacherId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let parsedGrade: number | undefined;
    if (grade !== undefined) {
      const numeric = parseInt(grade);
      parsedGrade = Number.isNaN(numeric)
        ? undefined
        : Math.max(0, Math.min(numeric, existing.assignment.maxGrade));
    }

    const submission = await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: parsedGrade,
        note: note !== undefined ? note : undefined,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Failed to update submission:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
