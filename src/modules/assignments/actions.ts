"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { requireRole, STAFF_ROLES } from "@/lib/permissions";
import { getTeacherScopeUserId } from "@/lib/teacher-access";

/**
 * Fetch a single assignment with all its submissions (including student info).
 */
export async function fetchSubmissions(assignmentId: string) {
  const user = await requireAuth();
  requireRole(user.role, STAFF_ROLES);
  const tenant = await requireTenant();
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

  const assignment = await db.assignment.findFirst({
    where: {
      id: assignmentId,
      tenantId: tenant.id,
      ...(teacherScopeUserId ? { group: { teacherId: teacherScopeUserId } } : {}),
    },
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
    const user = await requireAuth();
    requireRole(user.role, STAFF_ROLES);
    const tenant = await requireTenant();
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

    const existing = await db.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          select: { tenantId: true, maxGrade: true, group: { select: { teacherId: true } } },
        },
      },
    });

    if (!existing || existing.assignment.tenantId !== tenant.id) {
      return { success: false, error: "التسليم غير موجود." };
    }
    if (teacherScopeUserId && existing.assignment.group.teacherId !== teacherScopeUserId) {
      return { success: false, error: "ليس لديك صلاحية." };
    }

    const clampedGrade = Math.max(0, Math.min(grade, existing.assignment.maxGrade));

    const submission = await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade: clampedGrade, teacherComment, ...(aiData ?? {}) },
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
        message: `⭐ تم تصحيح واجب "${submission.assignment.title}" — درجتك: ${clampedGrade}`,
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
