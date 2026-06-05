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

    const conflict = await db.$transaction(async (tx) => {
      const duplicateRegistration = await tx.user.findFirst({
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
        return "هذا الطالب مسجل بالفعل في هذه المجموعة" as const;
      }

      const existingParent = await tx.user.findFirst({
        where: {
          tenantId: tenant.id,
          phone: parentPhone,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (existingParent && existingParent.role !== "PARENT") {
        return "رقم الهاتف مستخدم بالفعل لحساب آخر" as const;
      }

      const parent =
        existingParent ??
        (await tx.user.create({
          data: {
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
        }));

      const student = await tx.user.create({
        data: {
          tenantId: tenant.id,
          phone: `student-${Date.now()}`,
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

      await tx.groupStudent.create({
        data: {
          groupId: group.id,
          studentId: student.id,
          status: "PENDING",
        },
      });

      await tx.parentStudent.create({
        data: {
          parentId: parent.id,
          studentId: student.id,
        },
      });

      return null;
    });

    if (conflict) {
      return {
        success: false,
        message: conflict,
      };
    }

    revalidatePath("/");
    revalidatePath("/register");

    return {
      success: true,
      message: "تم إرسال طلب التسجيل بنجاح! ✅",
    };
  } catch (error) {
    console.error("DB registerStudent failed:", error);

    return {
      success: false,
      message: "تعذر إتمام التسجيل حاليًا",
    };
  }
}
