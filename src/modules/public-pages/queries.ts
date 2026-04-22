import { cache } from "react";

import { db } from "@/lib/db";
import { parseStoredGroupSchedule } from "@/modules/groups/schedule";

export const getPublicTenantProfile = async (tenantId: string) => {
  try {
    const tenant = await db.tenant.findFirst({
      where: {
        id: tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
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
    console.error("DB getPublicTenantProfile failed, using mock:", error);
  }

  return null;
};

export const getPublicGroups = cache(async (tenantId: string) => {
  try {
    const groups = await db.group.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            groupStudents: {
              where: { status: "ACTIVE" }
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return groups.map((group) => {
      const enrolledCount = group._count.groupStudents;
      const remainingCapacity = Math.max(group.maxCapacity - enrolledCount, 0);
      const schedule = parseStoredGroupSchedule(group.schedule, {
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
      });

      return {
        id: group.id,
        name: group.name,
        subject: group.subject,
        gradeLevel: group.gradeLevel,
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
        schedule,
        monthlyFee: group.monthlyFee,
        maxCapacity: group.maxCapacity,
        enrolledCount,
        remainingCapacity,
        color: group.color,
        isFull: remainingCapacity === 0,
      };
    });
  } catch (error) {
    console.error("DB getPublicGroups failed, using mock:", error);
  }

  return [];
});

