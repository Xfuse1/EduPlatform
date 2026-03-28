'use server';

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

const createStudentSchema = z.object({
  studentName: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  parentName: z.string().trim().min(2, "اسم ولي الأمر مطلوب"),
  parentPhone: z.string().trim().regex(/^01[0-9]{9}$/, "رقم الهاتف غير صحيح"),
  studentPhone: z.union([z.string().trim().regex(/^01[0-9]{9}$/, "رقم الهاتف غير صحيح"), z.literal("")]).optional(),
  gradeLevel: z.string().trim().min(1, "الصف الدراسي مطلوب"),
  groupId: z.string().trim().optional(),
});

type CreateStudentResult = {
  success: boolean;
  studentId?: string;
  message?: string;
};

type UpdateStudentResult = {
  success: boolean;
  studentId?: string;
  message?: string;
};

function generateId() {
  return randomUUID();
}

export async function createStudent(formData: FormData): Promise<CreateStudentResult> {
  const tenant = await requireTenant();

  const parsed = createStudentSchema.safeParse({
    studentName: formData.get("studentName"),
    studentPhone: formData.get("studentPhone"),
    parentName: formData.get("parentName"),
    parentPhone: formData.get("parentPhone"),
    gradeLevel: formData.get("gradeLevel"),
    groupId: formData.get("groupId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر حفظ بيانات الطالب",
    };
  }

  const { studentName, studentPhone, parentName, parentPhone, gradeLevel, groupId } = parsed.data;
  const normalizedGroupId = groupId?.trim() ? groupId.trim() : undefined;
  const normalizedStudentPhone = studentPhone?.trim() ? studentPhone.trim() : `student-${generateId()}`;

  try {
    const duplicateParent = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        phone: parentPhone,
        role: "PARENT",
      },
      select: {
        id: true,
      },
    });

    if (duplicateParent) {
      return {
        success: false,
        message: "ولي الأمر مسجل مسبقاً",
      };
    }

    if (normalizedGroupId) {
      const group = await db.group.findFirst({
        where: {
          id: normalizedGroupId,
          tenantId: tenant.id,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              students: true,
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

      if (group._count.students >= group.maxCapacity) {
        return {
          success: false,
          message: "لا توجد أماكن متاحة في هذه المجموعة",
        };
      }
    }

    const parent = await db.user.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenant.id,
          phone: parentPhone,
        },
      },
      create: {
        id: generateId(),
        tenantId: tenant.id,
        phone: parentPhone,
        name: parentName,
        role: "PARENT",
        isActive: true,
      },
      update: {},
      select: {
        id: true,
      },
    });

    const student = await db.user.create({
      data: {
        id: generateId(),
        tenantId: tenant.id,
        phone: normalizedStudentPhone,
        name: studentName,
        role: "STUDENT",
        isActive: true,
        gradeLevel,
        parentName,
        parentPhone,
      },
      select: {
        id: true,
      },
    });

    if (normalizedGroupId) {
      await db.groupStudent.create({
        data: {
          id: generateId(),
          groupId: normalizedGroupId,
          studentId: student.id,
          status: "ACTIVE",
          enrolledAt: new Date(),
        },
      });
    }

    await db.parentStudent.create({
      data: {
        id: generateId(),
        parentId: parent.id,
        studentId: student.id,
        relationship: "parent",
      },
    });

    revalidatePath("/teacher/students");

    return {
      success: true,
      studentId: student.id,
    };
  } catch (error) {
    console.error("DB createStudent failed:", error);

    return {
      success: false,
      message: "تعذر إضافة الطالب حاليًا",
    };
  }
}

export async function updateStudent(formData: FormData): Promise<UpdateStudentResult> {
  const tenant = await requireTenant();

  const parsed = createStudentSchema.extend({
    studentId: z.string().trim().min(1, "تعذر تحديد الطالب"),
  }).safeParse({
    studentId: formData.get("studentId"),
    studentName: formData.get("studentName"),
    studentPhone: formData.get("studentPhone"),
    parentName: formData.get("parentName"),
    parentPhone: formData.get("parentPhone"),
    gradeLevel: formData.get("gradeLevel"),
    groupId: formData.get("groupId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر تحديث بيانات الطالب",
    };
  }

  const { studentId, studentName, studentPhone, parentName, parentPhone, gradeLevel, groupId } = parsed.data;
  const normalizedGroupId = groupId?.trim() ? groupId.trim() : undefined;
  const normalizedStudentPhone = studentPhone?.trim() ? studentPhone.trim() : undefined;

  try {
    const existingStudent = await db.user.findFirst({
      where: {
        id: studentId,
        tenantId: tenant.id,
        role: "STUDENT",
      },
      include: {
        childOf: {
          include: {
            parent: {
              select: {
                id: true,
                phone: true,
              },
            },
          },
        },
        enrollments: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            groupId: true,
          },
        },
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        message: "الطالب غير موجود",
      };
    }

    const currentParentLink = existingStudent.childOf[0];

    if (!currentParentLink) {
      return {
        success: false,
        message: "تعذر العثور على ولي الأمر المرتبط",
      };
    }

    const duplicateParent = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        phone: parentPhone,
        role: "PARENT",
        NOT: {
          id: currentParentLink.parent.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateParent) {
      return {
        success: false,
        message: "ولي الأمر مسجل مسبقاً",
      };
    }

    if (normalizedStudentPhone) {
      const duplicateStudentPhone = await db.user.findFirst({
        where: {
          tenantId: tenant.id,
          phone: normalizedStudentPhone,
          role: "STUDENT",
          NOT: {
            id: studentId,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateStudentPhone) {
        return {
          success: false,
          message: "رقم هاتف الطالب مستخدم بالفعل",
        };
      }
    }

    if (normalizedGroupId) {
      const group = await db.group.findFirst({
        where: {
          id: normalizedGroupId,
          tenantId: tenant.id,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              students: {
                where: {
                  status: "ACTIVE",
                },
              },
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

      const alreadyEnrolled = existingStudent.enrollments.some((enrollment) => enrollment.groupId === normalizedGroupId);

      if (!alreadyEnrolled && group._count.students >= group.maxCapacity) {
        return {
          success: false,
          message: "لا توجد أماكن متاحة في هذه المجموعة",
        };
      }
    }

    await db.user.update({
      where: {
        id: studentId,
      },
      data: {
        name: studentName,
        phone: normalizedStudentPhone ?? existingStudent.phone,
        gradeLevel,
        parentName,
        parentPhone,
      },
    });

    await db.user.update({
      where: {
        id: currentParentLink.parent.id,
      },
      data: {
        name: parentName,
        phone: parentPhone,
      },
    });

    const currentEnrollmentIds = existingStudent.enrollments.map((enrollment) => enrollment.id);
    const currentEnrollment = existingStudent.enrollments[0];

    if (!normalizedGroupId && currentEnrollmentIds.length > 0) {
      await db.groupStudent.updateMany({
        where: {
          id: {
            in: currentEnrollmentIds,
          },
          student: {
            tenantId: tenant.id,
          },
        },
        data: {
          status: "ARCHIVED",
          droppedAt: new Date(),
        },
      });
    }

    if (normalizedGroupId) {
      if (currentEnrollment && currentEnrollment.groupId === normalizedGroupId) {
        await db.groupStudent.update({
          where: {
            id: currentEnrollment.id,
          },
          data: {
            status: "ACTIVE",
            droppedAt: null,
          },
        });
      } else {
        if (currentEnrollmentIds.length > 0) {
          await db.groupStudent.updateMany({
            where: {
              id: {
                in: currentEnrollmentIds,
              },
              student: {
                tenantId: tenant.id,
              },
            },
            data: {
              status: "ARCHIVED",
              droppedAt: new Date(),
            },
          });
        }

        await db.groupStudent.create({
          data: {
            id: generateId(),
            groupId: normalizedGroupId,
            studentId,
            status: "ACTIVE",
            enrolledAt: new Date(),
          },
        });
      }
    }

    revalidatePath("/teacher/students");

    return {
      success: true,
      studentId,
    };
  } catch (error) {
    console.error("DB updateStudent failed:", error);

    return {
      success: false,
      message: "تعذر تحديث بيانات الطالب حاليًا",
    };
  }
}
