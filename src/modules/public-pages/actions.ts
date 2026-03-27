'use server';

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { buildPhoneConflictMessage, findUserByPhone, isPhoneUniqueConstraintError } from "@/lib/user-phone";
import { publicRegistrationSchema } from "@/modules/public-pages/validations";

type RegistrationResult = {
  success: boolean;
  message: string;
};

function createInternalStudentPhone() {
  return `student-${randomUUID()}`;
}

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

  const group = await db.group.findFirst({
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
          status: {
            in: ["ACTIVE", "WAITLIST"],
          },
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!group) {
    return {
      success: false,
      message: "المجموعة المختارة غير متاحة",
    };
  }

  if (group.students.length >= group.maxCapacity) {
    return {
      success: false,
      message: "المجموعة المختارة ممتلئة حاليًا",
    };
  }

  const existingUser = await findUserByPhone(parentPhone);

  if (existingUser && (existingUser.tenantId !== tenant.id || existingUser.role !== "PARENT")) {
    return {
      success: false,
      message: buildPhoneConflictMessage(existingUser.role),
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const parent = await transaction.user.upsert({
        where: {
          tenantId_phone: {
            tenantId: tenant.id,
            phone: parentPhone,
          },
        },
        update: {
          name: parentName,
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

      const student = await transaction.user.create({
        data: {
          tenantId: tenant.id,
          phone: createInternalStudentPhone(),
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

      await transaction.parentStudent.create({
        data: {
          parentId: parent.id,
          studentId: student.id,
        },
      });

      await transaction.groupStudent.create({
        data: {
          groupId: group.id,
          studentId: student.id,
          status: "ACTIVE",
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      message: isPhoneUniqueConstraintError(error)
        ? buildPhoneConflictMessage()
        : "تعذر حفظ طلب التسجيل الآن",
    };
  }

  revalidatePath("/");
  revalidatePath("/register");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath("/parent");

  return {
    success: true,
    message: "تم حفظ طلب التسجيل بنجاح وربطه ببيانات السنتر.",
  };
}
