import { cache } from "react";

import { db } from "@/lib/db";
import { MOCK_GROUPS, MOCK_TENANT } from "@/lib/mock-data";

export const getTeacherPublicProfile = cache(async (tenantId: string) => {
  try {
    const tenant = await db.tenant.findFirst({
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

    if (tenant) {
      return tenant;
    }
  } catch (error) {
    console.error("DB getTeacherPublicProfile failed, using mock:", error);
  }

  return {
    id: MOCK_TENANT.id,
    name: MOCK_TENANT.name,
    logoUrl: MOCK_TENANT.logoUrl,
    themeColor: MOCK_TENANT.themeColor,
    region: MOCK_TENANT.region,
    bio: MOCK_TENANT.bio,
    subjects: MOCK_TENANT.subjects,
  };
});

export const getOpenGroups = cache(async (tenantId: string) => {
  try {
    const groups = await db.group.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return groups.map((group) => {
      const enrolledCount = group._count.students;
      const remainingCapacity = Math.max(group.maxCapacity - enrolledCount, 0);

      return {
        id: group.id,
        name: group.name,
        subject: group.subject,
        gradeLevel: group.gradeLevel,
        room: group.room,
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
        monthlyFee: group.monthlyFee,
        maxCapacity: group.maxCapacity,
        enrolledCount,
        remainingCapacity,
        color: group.color,
        isFull: remainingCapacity === 0,
      };
    });
  } catch (error) {
    console.error("DB getOpenGroups failed, using mock:", error);
  }

  return MOCK_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    subject: group.subject,
    gradeLevel: group.gradeLevel,
    room: null,
    days: group.days,
    timeStart: group.timeStart,
    timeEnd: group.timeEnd,
    monthlyFee: group.monthlyFee,
    maxCapacity: group.maxCapacity,
    enrolledCount: group.enrolledCount,
    remainingCapacity: Math.max(group.maxCapacity - group.enrolledCount, 0),
    color: group.color,
    isFull: group.enrolledCount >= group.maxCapacity,
  }));
});
