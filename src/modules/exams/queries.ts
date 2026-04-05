import { cache } from "react";
import { db } from "@/lib/db";

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
      submissions: { where: { studentId } },
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

    const submission = exam.submissions[0];

    return {
      ...exam,
      examDate: exam.startAt.toISOString(),
      durationMinutes: exam.duration,
      maxScore: exam.maxGrade,
      status,
      myScore: submission?.totalGrade,
    };
  });
});
