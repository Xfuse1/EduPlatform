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

const ASSIGNMENTS_PUBLIC_PREFIX = "/storage/v1/object/public/assignments/";

/**
 * Validates that a submitted fileUrl is a Supabase public URL on the
 * configured project host and inside the `assignments` bucket. Prevents
 * arbitrary/foreign URLs (SSRF / storage path tampering) from being stored.
 */
function isValidAssignmentFileUrl(fileUrl: unknown): fileUrl is string {
  if (typeof fileUrl !== "string" || fileUrl.length === 0) return false;

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseBase) return false;

  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(fileUrl);
    base = new URL(supabaseBase);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.host !== base.host) return false;
  if (!parsed.pathname.startsWith(ASSIGNMENTS_PUBLIC_PREFIX)) return false;

  // There must be an object path after the bucket prefix
  return parsed.pathname.length > ASSIGNMENTS_PUBLIC_PREFIX.length;
}

/**
 * Recomputes the storage object path from a validated assignments URL.
 * Returns null when the URL is not a recognized assignments public URL.
 */
function getAssignmentStoragePath(fileUrl: string): string | null {
  if (!isValidAssignmentFileUrl(fileUrl)) return null;
  try {
    const pathname = new URL(fileUrl).pathname;
    const storagePath = pathname.slice(ASSIGNMENTS_PUBLIC_PREFIX.length);
    return storagePath ? decodeURIComponent(storagePath) : null;
  } catch {
    return null;
  }
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

    // Verify the assignment belongs to the student's tenant and that the
    // student is actively enrolled in the assignment's group (prevent IDOR)
    const assignmentForAccess = await db.assignment.findUnique({
      where: { id: assignmentId },
      select: { tenantId: true, groupId: true },
    });

    if (!assignmentForAccess || assignmentForAccess.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const enrollment = await db.groupStudent.findFirst({
      where: {
        groupId: assignmentForAccess.groupId,
        studentId: user.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate fileUrl points at the expected Supabase assignments bucket
    if (!isValidAssignmentFileUrl(fileUrl)) {
      return NextResponse.json({ error: "رابط الملف غير صالح" }, { status: 422 });
    }

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

    // Optional: Delete from storage if URL exists.
    // Recompute the canonical object path from the validated URL rather than
    // trusting an arbitrary stored string.
    if (submission.fileUrl) {
      const storagePath = getAssignmentStoragePath(submission.fileUrl);
      if (storagePath) {
        try {
          const supabase = getSupabase();
          await supabase.storage.from("assignments").remove([storagePath]);
        } catch (storageError) {
          console.error("Failed to delete file from storage:", storageError);
          // We continue anyway to update the DB
        }
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
