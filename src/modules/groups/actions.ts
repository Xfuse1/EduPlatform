'use server';

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";

export async function createGroup(formData: FormData) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
      return { success: false, message: "غير مسموح لك بالقيام بهذا الإجراء" };
    }

    const name = formData.get("name") as string;
    const subject = formData.get("subject") as string;
    const gradeLevel = (formData.get("gradeLevel") as string) || "غير محدد";
    const days = (formData.get("days") as string).split("-").map(d => d.trim()).filter(Boolean);
    const timeStart = formData.get("timeStart") as string;
    const timeEnd = formData.get("timeEnd") as string;
    const monthlyFee = parseInt(formData.get("monthlyFee") as string);
    const maxCapacity = parseInt(formData.get("maxCapacity") as string);

    if (!name || !subject || !days.length || !timeStart || !timeEnd || isNaN(monthlyFee) || isNaN(maxCapacity)) {
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

    if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
      return { success: false, message: "غير مسموح لك بالقيام بهذا الإجراء" };
    }

    const groupId = formData.get("groupId") as string;
    const name = formData.get("name") as string;
    const subject = formData.get("subject") as string;
    const gradeLevel = (formData.get("gradeLevel") as string) || "غير محدد";
    const days = (formData.get("days") as string).split("-").map(d => d.trim()).filter(Boolean);
    const timeStart = formData.get("timeStart") as string;
    const timeEnd = formData.get("timeEnd") as string;
    const monthlyFee = parseInt(formData.get("monthlyFee") as string);
    const maxCapacity = parseInt(formData.get("maxCapacity") as string);

    if (!groupId || !name || !subject || !days.length || !timeStart || !timeEnd || isNaN(monthlyFee) || isNaN(maxCapacity)) {
      return { success: false, message: "يرجى ملء جميع الحقول المطلوبة بشكل صحيح" };
    }

    await db.group.update({
      where: {
        id: groupId,
        tenantId: tenant.id,
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
