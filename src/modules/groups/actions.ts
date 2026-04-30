'use server';

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getMinutesFromTime, getLegacyGroupScheduleFields, parseStoredGroupSchedule } from "@/modules/groups/schedule";
import { groupCreateSchema, normalizeGroupFormData, parseGroupFormData } from "@/modules/groups/validations";

function canManageGroups(role: string) {
  return role === "TEACHER" || role === "ASSISTANT" || role === "CENTER_ADMIN";
}

type GroupActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  group?: {
    id: string;
  };
};

function getValidationErrors(formData: FormData): GroupActionResult | null {
  const parsed = groupCreateSchema.safeParse(normalizeGroupFormData(formData));

  if (parsed.success) {
    return null;
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;
  const firstMessage = parsed.error.issues[0]?.message ?? "بيانات المجموعة غير صحيحة";

  return {
    success: false,
    message: firstMessage,
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors)
        .map(([key, value]) => [key, value?.[0] ?? ""])
        .filter(([, value]) => Boolean(value)),
    ),
  };
}

function getPayload(formData: FormData) {
  const parsedData = parseGroupFormData(formData);
  const { days, timeStart, timeEnd } = getLegacyGroupScheduleFields(parsedData.schedule);

  return {
    ...parsedData,
    days,
    timeStart,
    timeEnd,
  };
}

function revalidateGroupPaths(groupId?: string) {
  revalidatePath("/teacher/groups");
  revalidatePath("/teacher/schedule");
  revalidatePath("/center/schedule");
  revalidatePath("/teacher/students");

  if (groupId) {
    revalidatePath(`/teacher/groups/${groupId}`);
    revalidatePath(`/teacher/groups/${groupId}/edit`);
  }
}

function doTimesOverlap(startA: string, endA: string, startB: string, endB: string) {
  const a0 = getMinutesFromTime(startA);
  const a1 = getMinutesFromTime(endA);
  const b0 = getMinutesFromTime(startB);
  const b1 = getMinutesFromTime(endB);

  if (a0 === null || a1 === null || b0 === null || b1 === null) return false;
  return a0 < b1 && b0 < a1;
}

async function checkScheduleConflict(
  tenantId: string,
  schedule: Array<{ day: string; timeStart: string; timeEnd: string }>,
  excludeGroupId?: string,
): Promise<string | null> {
  const existingGroups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(excludeGroupId ? { id: { not: excludeGroupId } } : {}),
    },
    select: {
      name: true,
      days: true,
      timeStart: true,
      timeEnd: true,
      schedule: true,
    },
  });

  for (const entry of schedule) {
    for (const group of existingGroups) {
      const groupSchedule = parseStoredGroupSchedule(group.schedule, {
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
      });

      for (const slot of groupSchedule) {
        if (slot.day === entry.day && doTimesOverlap(entry.timeStart, entry.timeEnd, slot.timeStart, slot.timeEnd)) {
          return `يوجد تعارض مع مجموعة "${group.name}" في نفس اليوم والوقت`;
        }
      }
    }
  }

  return null;
}

export async function createGroup(formData: FormData): Promise<GroupActionResult> {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!canManageGroups(user.role)) {
      return { success: false, message: "غير مسموح لك بالقيام بهذا الإجراء" };
    }

    const validationResult = getValidationErrors(formData);

    if (validationResult) {
      return validationResult;
    }

    const payload = getPayload(formData);

    const conflict = await checkScheduleConflict(tenant.id, payload.schedule);
    if (conflict) {
      return { success: false, message: conflict };
    }

    const createdGroup = await db.group.create({
      data: {
        tenantId: tenant.id,
        teacherId: user.role === "TEACHER" ? user.id : null,
        name: payload.name,
        subject: payload.subject,
        gradeLevel: payload.gradeLevel,
        days: payload.days,
        timeStart: payload.timeStart,
        timeEnd: payload.timeEnd,
        room: payload.room ?? null,
        schedule: payload.schedule,
        monthlyFee: payload.monthlyFee,
        billingType: payload.billingType,
        maxCapacity: payload.maxCapacity,
        color: payload.color,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    revalidateGroupPaths(createdGroup.id);

    return {
      success: true,
      group: createdGroup,
    };
  } catch (error) {
    console.error("Failed to create group:", error);
    return { success: false, message: "حدث خطأ أثناء إنشاء المجموعة" };
  }
}

export async function updateGroup(
  groupIdOrFormData: string | FormData,
  maybeFormData?: FormData,
): Promise<GroupActionResult> {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!canManageGroups(user.role)) {
      return { success: false, message: "غير مسموح لك بالقيام بهذا الإجراء" };
    }

    const formData = groupIdOrFormData instanceof FormData ? groupIdOrFormData : maybeFormData;
    const groupId =
      typeof groupIdOrFormData === "string"
        ? groupIdOrFormData
        : String(groupIdOrFormData.get("groupId") ?? "").trim();

    if (!formData || !groupId) {
      return { success: false, message: "معرف المجموعة مطلوب للتعديل" };
    }

    const validationResult = getValidationErrors(formData);

    if (validationResult) {
      return validationResult;
    }

    const existingGroup = await db.group.findFirst({
      where: {
        id: groupId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        teacherId: true,
      },
    });

    if (!existingGroup) {
      return { success: false, message: "المجموعة غير موجودة" };
    }

    if (user.role === "TEACHER" && existingGroup.teacherId && existingGroup.teacherId !== user.id) {
      return { success: false, message: "لا يمكنك تعديل مجموعة لا تتبعك" };
    }

    const payload = getPayload(formData);

    const conflict = await checkScheduleConflict(tenant.id, payload.schedule, groupId);
    if (conflict) {
      return { success: false, message: conflict };
    }

    await db.group.update({
      where: {
        id: groupId,
      },
      data: {
        teacherId: existingGroup.teacherId ?? (user.role === "TEACHER" ? user.id : null),
        name: payload.name,
        subject: payload.subject,
        gradeLevel: payload.gradeLevel,
        days: payload.days,
        timeStart: payload.timeStart,
        timeEnd: payload.timeEnd,
        room: payload.room ?? null,
        schedule: payload.schedule,
        monthlyFee: payload.monthlyFee,
        billingType: payload.billingType,
        maxCapacity: payload.maxCapacity,
        color: payload.color,
      },
    });

    revalidateGroupPaths(groupId);

    return {
      success: true,
      group: {
        id: groupId,
      },
    };
  } catch (error) {
    console.error("Failed to update group:", error);
    return { success: false, message: "حدث خطأ أثناء تحديث المجموعة" };
  }
}

export async function deleteGroup(groupId: string): Promise<GroupActionResult> {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!canManageGroups(user.role)) {
      return { success: false, message: "غير مسموح لك بحذف المجموعة" };
    }

    const existingGroup = await db.group.findFirst({
      where: {
        id: groupId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        teacherId: true,
      },
    });

    if (!existingGroup) {
      return { success: false, message: "المجموعة غير موجودة" };
    }

    if (user.role === "TEACHER" && existingGroup.teacherId && existingGroup.teacherId !== user.id) {
      return { success: false, message: "لا يمكنك حذف مجموعة لا تتبعك" };
    }

    await db.group.delete({
      where: {
        id: groupId,
      },
    });

    revalidateGroupPaths(groupId);

    return {
      success: true,
      group: {
        id: groupId,
      },
    };
  } catch (error) {
    console.error("Failed to delete group:", error);
    return { success: false, message: "حدث خطأ أثناء حذف المجموعة" };
  }
}

export async function archiveGroup(groupId: string) {
  const user = await requireAuth();
  const tenant = await requireTenant();

  if (!canManageGroups(user.role)) {
    throw new Error("غير مسموح لك بأرشفة المجموعة");
  }

  const group = await db.group.update({
    where: {
      id: groupId,
    },
    data: {
      isActive: false,
    },
  });

  revalidateGroupPaths(groupId);
  return group;
}

