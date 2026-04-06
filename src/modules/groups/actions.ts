'use server';

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

function canManageGroups(role: string) {
  return role === "TEACHER" || role === "ASSISTANT" || role === "CENTER_ADMIN";
}

export async function createGroup(formData: FormData) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!canManageGroups(user.role)) {
      return { success: false, message: "غير مسموح لك بالقيام بهذا الإجراء" };
    }

    const name = String(formData.get("name") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const gradeLevel = String(formData.get("gradeLevel") ?? "غير محدد").trim() || "غير محدد";
    const days = String(formData.get("days") ?? "").split("-").map((day) => day.trim()).filter(Boolean);
    const timeStart = String(formData.get("timeStart") ?? "").trim();
    const timeEnd = String(formData.get("timeEnd") ?? "").trim();
    const monthlyFee = Number(formData.get("monthlyFee"));
    const maxCapacity = Number(formData.get("maxCapacity"));

    if (!name || !subject || days.length === 0 || !timeStart || !timeEnd || Number.isNaN(monthlyFee) || Number.isNaN(maxCapacity)) {
      return { success: false, message: "يرجى ملء جميع الحقول المطلوبة بشكل صحيح" };
    }

    await db.group.create({
      data: {
        tenantId: tenant.id,
        name,
        subject,
        gradeLevel,
        days,
        timeStart,
        timeEnd,
        monthlyFee,
        maxCapacity,
        isActive: true,
      },
    });

    revalidatePath("/teacher/groups");
    revalidatePath("/teacher/students");
    return { success: true };
  } catch (error) {
    console.error("Failed to create group:", error);
    return { success: false, message: "حدث خطأ أثناء إنشاء المجموعة" };
  }
}

export async function updateGroup(formData: FormData) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!canManageGroups(user.role)) {
      return { success: false, message: "غير مسموح لك بالقيام بهذا الإجراء" };
    }

    const groupId = String(formData.get("groupId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const gradeLevel = String(formData.get("gradeLevel") ?? "غير محدد").trim() || "غير محدد";
    const days = String(formData.get("days") ?? "").split("-").map((day) => day.trim()).filter(Boolean);
    const timeStart = String(formData.get("timeStart") ?? "").trim();
    const timeEnd = String(formData.get("timeEnd") ?? "").trim();
    const monthlyFee = Number(formData.get("monthlyFee"));
    const maxCapacity = Number(formData.get("maxCapacity"));

    if (!groupId || !name || !subject || days.length === 0 || !timeStart || !timeEnd || Number.isNaN(monthlyFee) || Number.isNaN(maxCapacity)) {
      return { success: false, message: "يرجى ملء جميع الحقول المطلوبة بشكل صحيح" };
    }

    await db.group.update({
      where: {
        id: groupId,
      },
      data: {
        name,
        subject,
        gradeLevel,
        days,
        timeStart,
        timeEnd,
        monthlyFee,
        maxCapacity,
      },
    });

    revalidatePath("/teacher/groups");
    revalidatePath("/teacher/students");
    return { success: true };
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

  revalidatePath("/teacher/groups");
  revalidatePath(`/teacher/groups/${groupId}`);
  return group;
}