'use server';

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getLegacyGroupScheduleFields } from "@/modules/groups/schedule";
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

