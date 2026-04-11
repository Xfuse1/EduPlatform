'use server';

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/config/routes";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeEgyptPhone } from "@/lib/phone";
import { isSameGradeLevel } from "@/lib/grade-levels";
import { getTenantBySlug, requireTenant } from "@/lib/tenant";
import { buildPhoneConflictMessage, findUserByPhone, isPhoneUniqueConstraintError } from "@/lib/user-phone";

const linkChildSchema = z.object({
  studentName: z.string().trim().min(2, "اسم الابن مطلوب"),
  studentPhone: z.string().trim().min(1, "رقم هاتف الابن مطلوب"),
  gradeLevel: z.string().trim().min(1, "الصف الدراسي مطلوب"),
  tenantSlug: z.string().trim().toLowerCase().optional(),
});

const enrollChildInGroupSchema = z.object({
  studentId: z.string().trim().min(1, "معرف الابن مطلوب"),
  groupId: z.string().trim().min(1, "المجموعة مطلوبة"),
});

const removeChildLinkSchema = z.object({
  studentId: z.string().trim().min(1, "معرف الابن مطلوب"),
});

function normalizeStudentPhone(value: string) {
  const normalized = normalizeEgyptPhone(value);

  if (!/^01\d{9}$/.test(normalized)) {
    throw new Error("يرجى إدخال رقم هاتف الابن بشكل صحيح");
  }

  return normalized;
}

async function resolveTargetTenant(tenantSlug?: string) {
  const currentTenant = await requireTenant();
  const normalizedTenantSlug = tenantSlug?.trim().toLowerCase();

  if (!normalizedTenantSlug) {
    return currentTenant;
  }

  const targetTenant = await getTenantBySlug(normalizedTenantSlug);

  if (!targetTenant || !targetTenant.isActive) {
    throw new Error("رابط السنتر غير صحيح أو غير متاح حاليًا");
  }

  if (targetTenant.accountType === "PARENT" && targetTenant.id !== currentTenant.id) {
    throw new Error("يمكن استخدام رابط سنتر فقط خارج حسابك الحالي");
  }

  return targetTenant;
}

function getLookupTenantScopeFilter(targetTenantId: string, tenantSlug?: string) {
  if (tenantSlug) {
    return {
      tenantId: targetTenantId,
    };
  }

  return {
    tenant: {
      isActive: true,
    },
  };
}

export async function linkChildToParent(input: {
  studentName: string;
  studentPhone: string;
  gradeLevel: string;
  tenantSlug?: string;
}) {
  const parent = await requireAuth();

  if (parent.role !== "PARENT") {
    return {
      success: false,
      message: "هذه العملية متاحة لولي الأمر فقط",
    };
  }

  const parsed = linkChildSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات إضافة الابن غير صحيحة",
    };
  }

  try {
    const studentName = parsed.data.studentName.trim();
    const studentPhone = normalizeStudentPhone(parsed.data.studentPhone);
    const gradeLevel = parsed.data.gradeLevel.trim();
    const tenantSlug = parsed.data.tenantSlug?.trim().toLowerCase();
    const targetTenant = await resolveTargetTenant(tenantSlug);
    const lookupTenantScopeFilter = getLookupTenantScopeFilter(targetTenant.id, tenantSlug);

    const matchingStudents = await db.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        name: {
          contains: studentName,
          mode: "insensitive",
        },
        phone: studentPhone,
        parentPhone: parent.phone,
        ...(gradeLevel
          ? {
              gradeLevel: {
                contains: gradeLevel,
                mode: "insensitive",
              },
            }
          : {}),
        ...lookupTenantScopeFilter,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 2,
      select: {
        id: true,
        name: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (matchingStudents.length > 1) {
      const missingHints = [
        gradeLevel ? null : "الصف الدراسي",
        tenantSlug ? null : "رابط السنتر",
      ].filter(Boolean);

      return {
        success: false,
        message: missingHints.length
          ? `وجدنا أكثر من ملف مطابق. أضف ${missingHints.join(" و ")} لتحديد الابن الصحيح بدقة.`
          : "وجدنا أكثر من ملف مطابق بهذه البيانات. راجع البيانات أو تواصل مع السنتر لتحديد الابن الصحيح.",
      };
    }

    if (matchingStudents.length === 1) {
      const [student] = matchingStudents;

      const existingRelation = await db.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: parent.id,
            studentId: student.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingRelation) {
        return {
          success: false,
          message: "هذا الابن مرتبط بالفعل بحسابك.",
        };
      }

      await db.parentStudent.create({
        data: {
          parentId: parent.id,
          studentId: student.id,
          relationship: "parent",
        },
      });

      revalidatePath(ROUTES.parent.dashboard);
      revalidatePath(ROUTES.parent.children);
      revalidatePath(`/parent/${student.id}`);

      return {
        success: true,
        message: `تم ربط ${student.name} بحسابك بنجاح.`,
        childName: student.name,
        tenantName: student.tenant.name,
        tenantSlug: student.tenant.slug,
        created: false,
      };
    }

    const sameParentStudent = await db.user.findFirst({
      where: {
        role: "STUDENT",
        isActive: true,
        phone: studentPhone,
        parentPhone: parent.phone,
        ...lookupTenantScopeFilter,
      },
      select: {
        id: true,
      },
    });

    if (sameParentStudent) {
      return {
        success: false,
        message: "وجدنا طالبًا بنفس رقم الهاتف ورقم ولي الأمر، لكن اسم الابن أو الصف الدراسي غير مطابقين. راجع البيانات ثم حاول مرة أخرى.",
      };
    }

    const existingStudent = await db.user.findFirst({
      where: {
        role: "STUDENT",
        isActive: true,
        phone: studentPhone,
        tenantId: targetTenant.id,
      },
      select: {
        id: true,
      },
    });

    if (existingStudent) {
      return {
        success: false,
        message: "هذا الطالب غير مسجل بنفس رقم ولي الأمر الموجود في حسابك.",
      };
    }

    const conflictingUser = await findUserByPhone(studentPhone);

    if (conflictingUser) {
      return {
        success: false,
        message: buildPhoneConflictMessage(conflictingUser.role),
      };
    }

    const createdStudent = await db.$transaction(async (tx) => {
      const student = await tx.user.create({
        data: {
          tenantId: targetTenant.id,
          role: "STUDENT",
          name: studentName,
          phone: studentPhone,
          gradeLevel,
          parentName: parent.name,
          parentPhone: parent.phone,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          tenant: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      });

      await tx.parentStudent.create({
        data: {
          parentId: parent.id,
          studentId: student.id,
          relationship: "parent",
        },
      });

      return student;
    });

    revalidatePath(ROUTES.parent.dashboard);
    revalidatePath(ROUTES.parent.children);
    revalidatePath(`/parent/${createdStudent.id}`);

    return {
      success: true,
      message: `تم إنشاء حساب للابن ${createdStudent.name} برقم الهاتف ${studentPhone} وربطه بحسابك بنجاح.`,
      childName: createdStudent.name,
      tenantName: createdStudent.tenant.name,
      tenantSlug: createdStudent.tenant.slug,
      created: true,
    };
  } catch (error) {
    return {
      success: false,
      message:
        isPhoneUniqueConstraintError(error)
          ? buildPhoneConflictMessage()
          : error instanceof Error
            ? error.message
            : "تعذر إضافة الابن الآن",
    };
  }
}

export async function removeChildFromParent(input: { studentId: string }) {
  const parent = await requireAuth();

  if (parent.role !== "PARENT") {
    return {
      success: false,
      message: "هذه العملية متاحة لولي الأمر فقط",
    };
  }

  const parsed = removeChildLinkSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات حذف الابن غير صحيحة",
    };
  }

  try {
    const relation = await db.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId: parsed.data.studentId,
        },
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!relation) {
      return {
        success: false,
        message: "هذا الابن غير مرتبط بحسابك.",
      };
    }

    await db.parentStudent.delete({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId: parsed.data.studentId,
        },
      },
    });

    revalidatePath(ROUTES.parent.dashboard);
    revalidatePath(ROUTES.parent.children);
    revalidatePath(`/parent/${parsed.data.studentId}`);

    return {
      success: true,
      message: `تم حذف ${relation.student.name} من قائمة أبنائي.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "تعذر حذف الابن الآن",
    };
  }
}

export async function enrollChildInGroup(input: { studentId: string; groupId: string }) {
  const parent = await requireAuth();

  if (parent.role !== "PARENT") {
    return {
      success: false,
      message: "هذه العملية متاحة لولي الأمر فقط",
    };
  }

  const parsed = enrollChildInGroupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات ضم الابن غير صحيحة",
    };
  }

  try {
    const relation = await db.parentStudent.findFirst({
      where: {
        parentId: parent.id,
        studentId: parsed.data.studentId,
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            tenantId: true,
            gradeLevel: true,
          },
        },
      },
    });

    if (!relation) {
      return {
        success: false,
        message: "هذا الابن غير مرتبط بحسابك.",
      };
    }

    const group = await db.group.findFirst({
      where: {
        id: parsed.data.groupId,
        tenantId: relation.student.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        maxCapacity: true,
      },
    });

    if (!group) {
      return {
        success: false,
        message: "المجموعة المطلوبة غير متاحة لهذا الابن.",
      };
    }

    if (relation.student.gradeLevel && !isSameGradeLevel(relation.student.gradeLevel, group.gradeLevel)) {
      return {
        success: false,
        message: "هذه المجموعة ليست لنفس الصف الدراسي الخاص بالابن.",
      };
    }

    const existingEnrollment = await db.groupStudent.findUnique({
      where: {
        groupId_studentId: {
          groupId: group.id,
          studentId: relation.student.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingEnrollment?.status === "ACTIVE") {
      return {
        success: false,
        message: "الابن منضم بالفعل إلى هذه المجموعة.",
      };
    }

    if (existingEnrollment?.status === "WAITLIST") {
      return {
        success: false,
        message: "الابن موجود بالفعل في قائمة انتظار هذه المجموعة.",
      };
    }

    const activeEnrollmentCount = await db.groupStudent.count({
      where: {
        groupId: group.id,
        status: "ACTIVE",
      },
    });

    const nextStatus = activeEnrollmentCount >= group.maxCapacity ? "WAITLIST" : "ACTIVE";

    await db.$transaction(async (tx) => {
      if (existingEnrollment) {
        await tx.groupStudent.update({
          where: {
            id: existingEnrollment.id,
          },
          data: {
            status: nextStatus,
            droppedAt: null,
          },
        });

        return;
      }

      await tx.groupStudent.create({
        data: {
          groupId: group.id,
          studentId: relation.student.id,
          status: nextStatus,
        },
      });
    });

    revalidatePath(ROUTES.parent.dashboard);
    revalidatePath(ROUTES.parent.children);
    revalidatePath(`/parent/${relation.student.id}`);
    revalidatePath(ROUTES.student.dashboard);
    revalidatePath(ROUTES.student.schedule);
    revalidatePath(ROUTES.teacher.groups);
    revalidatePath(`${ROUTES.teacher.groups}/${group.id}`);
    revalidatePath(`${ROUTES.teacher.students}/${relation.student.id}`);

    return {
      success: true,
      message:
        nextStatus === "ACTIVE"
          ? `تم ضم ${relation.student.name} إلى مجموعة ${group.name} بنجاح.`
          : `تم إضافة ${relation.student.name} إلى قائمة انتظار مجموعة ${group.name}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "تعذر ضم الابن إلى المجموعة الآن",
    };
  }
}
