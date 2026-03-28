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

    const submission = await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: grade !== undefined ? parseInt(grade) : undefined,
        note: note !== undefined ? note : undefined,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Failed to update submission:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
