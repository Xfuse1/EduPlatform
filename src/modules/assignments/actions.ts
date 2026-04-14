"use server";

import { db } from "@/lib/db";

/**
 * Fetch a single assignment with all its submissions (including student info).
 */
export async function fetchSubmissions(assignmentId: string) {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      submissions: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  return assignment;
}

/**
 * Grade a submission manually or via AI.
 */
export async function gradeSubmission(
  submissionId: string,
  grade: number,
  aiData?: {
    aiGrade: number;
    aiFeedback: string;
    gradedByAi: boolean;
  },
  teacherComment?: string
) {
  try {
    const submission = await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade, teacherComment, ...(aiData ?? {}) },
      include: {
        assignment: { select: { title: true, tenantId: true } },
        student: { select: { id: true } },
      },
    });

    await db.notification.create({
      data: {
        tenantId: submission.assignment.tenantId,
        userId: submission.student.id,
        type: "GRADE_ADDED",
        message: `⭐ تم تصحيح واجب "${submission.assignment.title}" — درجتك: ${grade}`,
        channel: "PUSH",
        status: "QUEUED",
        recipientPhone: "",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("gradeSubmission error:", error);
    return { success: false, error: String(error) };
  }
}
