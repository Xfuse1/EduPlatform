import { cache } from "react";

import { db } from "@/lib/db";

export const getTeacherPublicProfile = cache(async (tenantId: string) => {
  return db.tenant.findFirst({
    where: {
      id: tenantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      themeColor: true,
      region: true,
      bio: true,
      subjects: true,
    },
  });
});

export const getOpenGroups = cache(async (tenantId: string) => {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      days: true,
      timeStart: true,
      timeEnd: true,
      monthlyFee: true,
      maxCapacity: true,
      color: true,
      students: {
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      },
    },
  });

  return groups.map((group) => {
    const enrolledCount = group.students.length;

    return {
      id: group.id,
      name: group.name,
      days: group.days,
      timeStart: group.timeStart,
      timeEnd: group.timeEnd,
      monthlyFee: group.monthlyFee,
      maxCapacity: group.maxCapacity,
      enrolledCount,
      remainingCapacity: Math.max(group.maxCapacity - enrolledCount, 0),
      color: group.color,
      isFull: enrolledCount >= group.maxCapacity,
    };
  });
});
