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

  const duplicateEnrollment = await db.groupStudent.findFirst({
    where: {
      groupId,
      student: {
        tenantId: tenant.id,
        name: studentName,
        parentPhone,
      },
      group: {
        tenantId: tenant.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicateEnrollment) {
    return {
      success: false,
      message: "هذا الطالب مسجل بالفعل في هذه المجموعة بنفس رقم ولي الأمر",
    };
  }

  const targetGroup = await db.group.findFirst({
    where: {
      id: groupId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      id: true,
      maxCapacity: true,
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

  if (!targetGroup) {
    return {
      success: false,
      message: "المجموعة المختارة غير متاحة الآن",
    };
  }

  if (targetGroup.students.length >= targetGroup.maxCapacity) {
    return {
      success: false,
      message: "المجموعة ممتلئة حاليًا",
    };
  }

  await db.user.create({
    data: {
      tenantId: tenant.id,
      name: studentName,
      phone: `${parentPhone}-${Date.now()}`,
      role: "STUDENT",
      gradeLevel: grade,
      parentName,
      parentPhone,
      enrollments: {
        create: {
          groupId,
          status: "ACTIVE",
        },
      },
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/register");

  return {
    success: true,
    message: "تم التسجيل بنجاح! ✅",
  };
}
