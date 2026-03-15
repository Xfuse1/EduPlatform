import { cache } from "react";

import { db } from "@/lib/db";

export const getStudentCountSummary = cache(async (tenantId: string) => {
  const total = await db.user.count({
    where: { tenantId, role: "STUDENT", isActive: true },
  });

  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 30);

  const recent = await db.user.count({
    where: {
      tenantId,
      role: "STUDENT",
      isActive: true,
      createdAt: { gte: recentDate },
    },
  });

  return { total, recent };
});

export const getStudentProfile = cache(async (tenantId: string, studentId: string) => {
  return db.user.findFirst({
    where: { tenantId, id: studentId, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      enrollments: {
        where: { status: "ACTIVE", group: { tenantId } },
        select: {
          group: {
            select: {
              id: true,
              name: true,
              timeStart: true,
              timeEnd: true,
              days: true,
            },
          },
        },
      },
    },
  });
});

export const getParentChildren = cache(async (tenantId: string, parentId: string) => {
  return db.parentStudent.findMany({
    where: {
      parentId,
      parent: { tenantId },
      student: { tenantId },
    },
    select: {
      student: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          enrollments: {
            where: { status: "ACTIVE", group: { tenantId } },
            select: {
              group: {
                select: {
                  name: true,
                  days: true,
                  timeStart: true,
                  timeEnd: true,
                },
              },
            },
          },
        },
      },
    },
  });
});
