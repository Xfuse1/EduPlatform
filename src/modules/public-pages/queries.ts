import { cache } from "react";

import { MOCK_GROUPS, MOCK_TENANT } from "@/lib/mock-data";

export const getTeacherPublicProfile = cache(async (_tenantId: string) => {
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

export const getOpenGroups = cache(async (_tenantId: string) => {
  return MOCK_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
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
