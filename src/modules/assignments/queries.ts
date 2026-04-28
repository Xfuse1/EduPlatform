import { cache } from "react";
import { db } from "@/lib/db";

export const getAssignmentsByGroup = async (tenantId: string, groupId?: string) => {
  try {
    return await db.assignment.findMany({
      where: {
        ...(groupId && groupId !== "all" ? { groupId } : {}),
        group: {
          tenantId,
        },
      },
      include: {
        group: { select: { name: true } },
        submissions: {
          select: {
            grade: true,
            student: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } catch (error) {
    console.error("Failed to get assignments:", error);
    return [];
  }
};

export const getSubmissionsByAssignment = cache(async (assignmentId: string) => {
  try {
    return await db.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        group: { select: { name: true } },
        submissions: {
          include: {
            student: { select: { name: true, phone: true } },
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to get assignment details:", error);
    return null;
  }
});

export const getAssignmentsByStudent = cache(async (studentId: string) => {
  try {
    const enrollments = await db.groupStudent.findMany({
      where: { studentId, status: "ACTIVE" },
      select: { groupId: true },
    });

    const groupIds = enrollments.map((e) => e.groupId);

    const assignments = await db.assignment.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        group: { select: { name: true, subject: true } },
        submissions: {
          where: { studentId },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return assignments.map((a: any) => {
      const submission = a.submissions[0] || null;
      let status: "pending" | "submitted" | "graded" | "overdue" = "pending";
      if (submission) {
        status = submission.grade !== null ? "graded" : "submitted";
      } else if (new Date() > new Date(a.dueDate)) {
        status = "overdue";
      }
      return {
        ...a,
        fileUrl: a.fileUrl ?? null,
        fileLink: a.fileLink ?? null,
        submission,
        status,
      };
    });
  } catch (error) {
    console.error("Failed to get student assignments:", error);
    return [];
  }
});

export const getAssignmentsByParent = cache(async (_tenantId: string, parentId: string) => {
  try {
    const parentChildren = await db.parentStudent.findMany({
      where: { parentId },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    return await Promise.all(
      parentChildren.map(async (pc) => {
        const student = pc.student;
        const assignments = await getAssignmentsByStudent(student.id);
        const pending = assignments.filter((a: any) => a.status === "pending" || a.status === "overdue");
        const graded = assignments.filter((a: any) => a.status === "graded");
        
        return {
          childId: student.id,
          childName: student.name,
          lastPendingAssignment: pending.length > 0 ? {
            title: pending[0].title,
            dueDate: pending[0].dueDate
              ? new Date(pending[0].dueDate).toLocaleDateString("ar-EG")
              : "غير محدد",
          } : undefined,
          lastGrade: graded.length > 0 ? {
            assignmentTitle: graded[0].title,
            grade: graded[0].submission!.grade || 0,
            maxGrade: graded[0].maxGrade ?? 100
          } : undefined,
        };
      })
    );
  } catch (error) {
    console.error("Failed to get parent assignments:", error);
    return [];
  }
});

export const getTeacherGroups = cache(async (tenantId: string) => {
    return await db.group.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
    });
});
