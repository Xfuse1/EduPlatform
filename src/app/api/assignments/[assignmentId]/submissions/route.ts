import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendNotification } from "@/modules/notifications/actions";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { assignmentId } = await params;

    const submission = await db.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: user.id
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.grade !== null) {
      return NextResponse.json({ error: "Cannot delete graded assignment" }, { status: 403 });
    }

    // Optional: Delete from storage if URL exists
    if (submission.fileUrl) {
      try {
        const supabase = getSupabase();
        // Extract path from public URL
        // URL format: .../storage/v1/object/public/assignments/folder/file
        const urlParts = submission.fileUrl.split("/public/assignments/");
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          await supabase.storage.from("assignments").remove([storagePath]);
        }
      } catch (storageError) {
        console.error("Failed to delete file from storage:", storageError);
        // We continue anyway to update the DB
      }
    }

    // Delete the entire submission record
    await db.assignmentSubmission.delete({
      where: { id: submission.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
