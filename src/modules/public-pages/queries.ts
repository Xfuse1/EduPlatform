import { cache } from "react";

import { db } from "@/lib/db";
import { formatDisplayTime } from "@/lib/schedule";

export const getTeacherPublicProfile = cache(async (tenantId: string) => {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
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

  if (!tenant) {
    return null;
  }

  return tenant;
});

export const getOpenGroups = cache(async (tenantId: string) => {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      subject: true,
      gradeLevel: true,
      room: true,
      days: true,
      timeStart: true,
      timeEnd: true,
      monthlyFee: true,
      maxCapacity: true,
      color: true,
      students: {
        select: {
          status: true,
        },
      },
    },
  });

  return groups.map((group) => {
    const enrolledCount = group.students.filter((student) => student.status === "ACTIVE" || student.status === "WAITLIST").length;
    const remainingCapacity = Math.max(group.maxCapacity - enrolledCount, 0);

    return {
      id: group.id,
      name: group.name,
      subject: group.subject,
      gradeLevel: group.gradeLevel,
      room: group.room,
      days: group.days,
      timeStart: formatDisplayTime(group.timeStart),
      timeEnd: formatDisplayTime(group.timeEnd),
      monthlyFee: group.monthlyFee,
      maxCapacity: group.maxCapacity,
      enrolledCount,
      remainingCapacity,
      color: group.color,
      isFull: remainingCapacity === 0,
    };
  });
});

export const getPublicTenantProfile = getTeacherPublicProfile;
export const getPublicGroups = getOpenGroups;
