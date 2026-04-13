import { cache } from "react";
import { db } from "@/lib/db";

export type ParentExamReport = {
  id: string;
  childName: string;
  gradeLevel: string;
  lastCompleted: {
    title: string;
    score: number;
    maxScore: number;
    date: string;
    status: "excellent" | "good" | "average" | "poor";
  } | null;
  upcoming: {
    title: string;
    date: string;
    type: "online" | "offline";
  } | null;
};

function toScoreStatus(score: number, maxScore: number): "excellent" | "good" | "average" | "poor" {
  if (maxScore <= 0) return "poor";
  const ratio = score / maxScore;
  if (ratio >= 0.85) return "excellent";
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.5) return "average";
  return "poor";
}

function formatArabicDate(date: Date) {
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatArabicDateTime(date: Date) {
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// جلب امتحانات المجموعة للمعلم
export const getExamsByTenant = cache(async (tenantId: string) => {
  const exams = await db.exam.findMany({
    where: { tenantId },
    include: { 
      group: { select: { name: true } }, 
      _count: { select: { submissions: true } },
      questions: true
    },
    orderBy: { startAt: "desc" },
  });

  return exams.map((exam) => {
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(start.getTime() + exam.duration * 60000);

    let status: "upcoming" | "active" | "completed" = "upcoming";
    if (now > end) status = "completed";
    else if (now >= start) status = "active";

    return {
      ...exam,
      examDate: exam.startAt.toISOString(),
      durationMinutes: exam.duration,
      maxScore: exam.maxGrade,
      status,
    };
  });
});

// جلب امتحانات الطالب
export const getExamsByStudent = cache(async (tenantId: string, studentId: string) => {
  const groups = await db.groupStudent.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { groupId: true },
  });
  const groupIds = groups.map((g) => g.groupId);

  const exams = await db.exam.findMany({
    where: { tenantId, groupId: { in: groupIds } },
    include: {
      submissions: { 
        where: { studentId },
        select: { totalGrade: true, submittedAt: true }
      },
    },
    orderBy: { startAt: "desc" },
  });

  return exams.map((exam) => {
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(start.getTime() + exam.duration * 60000);

    let status: "upcoming" | "active" | "completed" = "upcoming";
    if (now > end) status = "completed";
    else if (now >= start) status = "active";

    const hasSubmitted = exam.submissions.length > 0;
    const submission = exam.submissions[0];

    return {
      ...exam,
      examDate: exam.startAt.toISOString(),
      durationMinutes: exam.duration,
      maxScore: exam.maxGrade,
      status: hasSubmitted ? "completed" : status,
      myScore: hasSubmitted ? submission.totalGrade : null,
    };
  });
});

export const getParentExamReports = cache(async (tenantId: string, parentId: string): Promise<ParentExamReport[]> => {
  try {
    const parentChildren = await db.parentStudent.findMany({
      where: {
        parentId,
        student: {
          tenantId,
          role: "STUDENT",
          isActive: true,
        },
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            groupStudents: {
              where: {
                status: "ACTIVE",
              },
              select: {
                groupId: true,
              },
            },
          },
        },
      },
    });

    if (parentChildren.length === 0) {
      return [];
    }

    const studentIds = parentChildren.map((item) => item.student.id);
    const allGroupIds = Array.from(
      new Set(
        parentChildren.flatMap((item) => item.student.groupStudents.map((groupStudent) => groupStudent.groupId)),
      ),
    );

    if (allGroupIds.length === 0) {
      return parentChildren.map((item) => ({
        id: item.student.id,
        childName: item.student.name,
        gradeLevel: item.student.gradeLevel ?? "غير محدد",
        lastCompleted: null,
        upcoming: null,
      }));
    }

    const exams = await db.exam.findMany({
      where: {
        tenantId,
        groupId: {
          in: allGroupIds,
        },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        maxGrade: true,
        groupId: true,
        submissions: {
          where: {
            studentId: {
              in: studentIds,
            },
          },
          select: {
            studentId: true,
            totalGrade: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    const now = new Date();

    return parentChildren.map((item) => {
      const child = item.student;
      const childGroupIds = new Set(child.groupStudents.map((groupStudent) => groupStudent.groupId));
      const childExams = exams.filter((exam) => childGroupIds.has(exam.groupId));

      const completedExam = childExams.find((exam) =>
        exam.submissions.some((submission) => submission.studentId === child.id && submission.totalGrade !== null),
      );

      const upcomingExam = childExams
        .filter((exam) => exam.startAt >= now)
        .filter((exam) => !exam.submissions.some((submission) => submission.studentId === child.id))
        .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())[0];

      let lastCompleted: ParentExamReport["lastCompleted"] = null;

      if (completedExam) {
        const submission = completedExam.submissions.find((entry) => entry.studentId === child.id);
        const score = submission?.totalGrade ?? 0;
        const maxScore = completedExam.maxGrade || 100;

        lastCompleted = {
          title: completedExam.title,
          score,
          maxScore,
          date: formatArabicDate(submission?.submittedAt ?? completedExam.startAt),
          status: toScoreStatus(score, maxScore),
        };
      }

      const upcoming = upcomingExam
        ? {
            title: upcomingExam.title,
            date: formatArabicDateTime(upcomingExam.startAt),
            type: "offline" as const,
          }
        : null;

      return {
        id: child.id,
        childName: child.name,
        gradeLevel: child.gradeLevel ?? "غير محدد",
        lastCompleted,
        upcoming,
      };
    });
  } catch (error) {
    console.error("Failed to get parent exams:", error);
    return [];
  }
});
