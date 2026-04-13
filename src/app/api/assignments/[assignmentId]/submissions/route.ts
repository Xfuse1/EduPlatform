import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendNotification } from "@/modules/notifications/actions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { assignmentId } = await params;
    const body = await req.json();
    const { fileUrl, note } = body;

    // Check if already graded
    const existingSubmission = await db.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: user.id
        }
      }
    });

    if (existingSubmission && existingSubmission.grade !== null) {
      return NextResponse.json({ error: "Cannot edit graded assignment" }, { status: 403 });
    }

    const submission = await db.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: user.id,
        },
      },
      update: {
        fileUrl,
        note,
        submittedAt: new Date(),
      },
      create: {
        assignmentId,
        studentId: user.id,
        fileUrl,
        note,
      },
    });

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        title: true,
        group: {
          select: { teacherId: true },
        },
      },
    });

    const student = await db.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    if (assignment?.group.teacherId) {
      await sendNotification({
        userId: assignment.group.teacherId,
        type: 'ASSIGNMENT_DUE',
        channel: 'IN_APP',
        templateData: {
          studentName: student?.name ?? '',
          assignmentTitle: assignment.title,
        },
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Failed to submit assignment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
