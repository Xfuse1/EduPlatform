'use server';

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { publicRegistrationSchema } from "@/modules/public-pages/validations";

type RegistrationResult = {
  success: boolean;
  message: string;
};

export async function registerStudent(formData: FormData): Promise<RegistrationResult> {
  const tenant = await requireTenant();

  const parsed = publicRegistrationSchema.safeParse({
    studentName: formData.get("studentName"),
    parentName: formData.get("parentName"),
    parentPhone: formData.get("parentPhone"),
    grade: formData.get("grade"),
    groupId: formData.get("groupId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات التسجيل غير صحيحة",
    };
  }

  const { studentName, parentName, parentPhone, grade, groupId } = parsed.data;

  try {
    const group = await db.group.findFirst({
      where: {
        id: groupId,
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!group) {
      return {
        success: false,
        message: "المجموعة المختارة غير متاحة",
      };
    }

    const duplicateRegistration = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: "STUDENT",
        name: studentName,
        parentPhone,
        groupStudents: {
          some: {
            groupId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateRegistration) {
      return {
        success: false,
        message: "هذا الطالب مسجل بالفعل في هذه المجموعة",
      };
    }

    const parent = await db.user.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenant.id,
          phone: parentPhone,
        },
      },
      update: {
        name: parentName,
        role: "PARENT",
        parentName,
        parentPhone,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        phone: parentPhone,
        name: parentName,
        role: "PARENT",
        parentName,
        parentPhone,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const student = await db.user.create({
      data: {
        tenantId: tenant.id,
        phone: `${parentPhone}-${Date.now()}`,
        name: studentName,
        role: "STUDENT",
        gradeLevel: grade,
        parentName,
        parentPhone,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await db.groupStudent.create({
      data: {
        groupId: group.id,
        studentId: student.id,
        status: "ACTIVE",
      },
    });

    await db.parentStudent.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/register");

    return {
      success: true,
      message: "تم التسجيل بنجاح! ✅",
    };
  } catch (error) {
    console.error("DB registerStudent failed:", error);

    return {
      success: false,
      message: "تعذر إتمام التسجيل حاليًا",
    };
  }
}
