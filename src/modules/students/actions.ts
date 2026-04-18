'use server';

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { normalizeEgyptPhone } from "@/lib/phone";
import { requireTenant } from "@/lib/tenant";

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

type NormalizedStudentInput = {
  studentId?: string;
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  gradeLevel: string;
  groupIds: string[];
  syncGroups: boolean;
  hasExplicitGroupSelection: boolean;
};

function generateId() {
  return randomUUID();
}

function getString(formData: FormData, ...keys: string[]) {
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") {
      return value.trim();
    }
  }

  return "";
}

function getGroupIds(formData: FormData) {
  const rawGroupIds = formData.getAll("groupIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (rawGroupIds.length > 0) {
    return rawGroupIds;
  }

  const legacyGroupId = getString(formData, "groupId");
  return legacyGroupId ? [legacyGroupId] : [];
}

function normalizeStudentInput(formData: FormData, studentIdOverride?: string): NormalizedStudentInput {
  return {
    studentId: studentIdOverride ?? (getString(formData, "studentId") || undefined),
    name: getString(formData, "name", "studentName"),
    phone: normalizeEgyptPhone(getString(formData, "phone", "studentPhone")),
    parentName: getString(formData, "parentName"),
    parentPhone: normalizeEgyptPhone(getString(formData, "parentPhone")),
    gradeLevel: getString(formData, "gradeLevel"),
    groupIds: [...new Set(getGroupIds(formData))],
    syncGroups: String(formData.get("syncGroups") ?? "false") === "true",
    hasExplicitGroupSelection: formData.has("groupIds") || formData.has("groupId"),
  };
}

function validateStudentInput(input: NormalizedStudentInput, requireStudentId = false) {
  if (requireStudentId && !input.studentId) {
    return "تعذر تحديد الطالب";
  }

  if (input.name.length < 2) {
    return "اسم الطالب يجب أن يكون حرفين على الأقل";
  }

  if (input.parentPhone && !/^01\d{9}$/.test(input.parentPhone)) {
    return "رقم هاتف ولي الأمر غير صحيح";
  }

  if (input.parentName && input.parentName.length < 2) {
    return "اسم ولي الأمر مطلوب";
  }

  if (!input.gradeLevel) {
    return "الصف الدراسي مطلوب";
  }

  if (input.phone && !/^01\d{9}$/.test(input.phone)) {
    return "رقم هاتف الطالب غير صحيح";
  }

  return null;
}

async function upsertParent(tenantId: string, parentName: string, parentPhone: string) {
  return db.user.upsert({
    where: {
      tenantId_phone: {
        tenantId,
        phone: parentPhone,
      },
    },
    create: {
      id: generateId(),
      tenantId,
      phone: parentPhone,
      name: parentName,
      role: "PARENT",
      isActive: true,
    },
    update: {
      name: parentName,
      isActive: true,
    },
    select: {
      id: true,
    },
  });
}

async function syncParentLink(parentId: string, studentId: string) {
  await db.parentStudent.deleteMany({
    where: {
      studentId,
    },
  });

  await db.parentStudent.create({
    data: {
      id: generateId(),
      parentId,
      studentId,
      relationship: "parent",
    },
  });
}

async function syncGroupMemberships(tenantId: string, studentId: string, groupIds: string[]) {
  const desiredGroupIds = [...new Set(groupIds.filter(Boolean))];

  const existingEnrollments = await db.groupStudent.findMany({
    where: {
      studentId,
      group: {
        tenantId,
      },
    },
    select: {
      id: true,
      groupId: true,
      status: true,
    },
  });

  const activeEnrollmentStatuses = new Set(["ACTIVE", "WAITLIST"]);
  const removedGroupIds = existingEnrollments
    .filter((enrollment) => activeEnrollmentStatuses.has(enrollment.status) && !desiredGroupIds.includes(enrollment.groupId))
    .map((enrollment) => enrollment.groupId);

  if (removedGroupIds.length > 0) {
    await db.groupStudent.updateMany({
      where: {
        studentId,
        groupId: {
          in: removedGroupIds,
        },
      },
      data: {
        status: "ARCHIVED",
        droppedAt: new Date(),
      },
    });
  }

  for (const groupId of desiredGroupIds) {
    const group = await db.group.findFirst({
      where: {
        id: groupId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        maxCapacity: true,
      },
    });

    if (!group) {
      continue;
    }

    const existingEnrollment = existingEnrollments.find((enrollment) => enrollment.groupId === groupId);
    const activeCount = await db.groupStudent.count({
      where: {
        groupId,
        status: "ACTIVE",
      },
    });

    const nextStatus = existingEnrollment?.status === "ACTIVE"
      ? "ACTIVE"
      : activeCount >= group.maxCapacity
        ? "WAITLIST"
        : "ACTIVE";

    if (existingEnrollment) {
      await db.groupStudent.update({
        where: {
          id: existingEnrollment.id,
        },
        data: {
          status: nextStatus,
          droppedAt: null,
        },
      });
      continue;
    }

    await db.groupStudent.create({
      data: {
        id: generateId(),
        groupId,
        studentId,
        status: nextStatus,
        enrolledAt: new Date(),
      },
    });
  }
}

async function createStudentForTenant(tenantId: string, input: NormalizedStudentInput): Promise<CreateStudentResult> {
  const validationMessage = validateStudentInput(input);
  if (validationMessage) {
    return { success: false, message: validationMessage };
  }

  const storedStudentPhone = input.phone || `student-${generateId()}`;

  try {
    if (input.phone) {
      const duplicateStudent = await db.user.findFirst({
        where: {
          tenantId,
          phone: storedStudentPhone,
          role: "STUDENT",
        },
        select: { id: true },
      });

      if (duplicateStudent) {
        return { success: false, message: "رقم هاتف الطالب مستخدم بالفعل" };
      }
    }

    const parent = input.parentPhone
      ? await upsertParent(tenantId, input.parentName, input.parentPhone)
      : null;

    const student = await db.user.create({
      data: {
        id: generateId(),
        tenantId,
        phone: storedStudentPhone,
        name: input.name,
        role: "STUDENT",
        isActive: true,
        gradeLevel: input.gradeLevel,
        parentName: input.parentName,
        parentPhone: input.parentPhone,
      },
      select: {
        id: true,
      },
    });

    if (parent) await syncParentLink(parent.id, student.id);

    if (input.groupIds.length > 0) {
      await syncGroupMemberships(tenantId, student.id, input.groupIds);
    }

    revalidatePath("/teacher/students");
    revalidatePath("/teacher/groups");

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

async function updateStudentForTenant(tenantId: string, input: NormalizedStudentInput): Promise<UpdateStudentResult> {
  const validationMessage = validateStudentInput(input, true);
  if (validationMessage) {
    return { success: false, message: validationMessage };
  }

  try {
    const existingStudent = await db.user.findFirst({
      where: {
        id: input.studentId,
        tenantId,
        role: "STUDENT",
      },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        message: "الطالب غير موجود",
      };
    }

    if (input.phone) {
      const duplicateStudent = await db.user.findFirst({
        where: {
          tenantId,
          phone: input.phone,
          role: "STUDENT",
          NOT: {
            id: existingStudent.id,
          },
        },
        select: { id: true },
      });

      if (duplicateStudent) {
        return {
          success: false,
          message: "رقم هاتف الطالب مستخدم بالفعل",
        };
      }
    }

    const parent = input.parentPhone
      ? await upsertParent(tenantId, input.parentName, input.parentPhone)
      : null;

    await db.user.update({
      where: {
        id: existingStudent.id,
      },
      data: {
        name: input.name,
        phone: input.phone || existingStudent.phone,
        gradeLevel: input.gradeLevel,
        parentName: input.parentName,
        parentPhone: input.parentPhone,
      },
    });

    if (parent) await syncParentLink(parent.id, existingStudent.id);

    if (input.syncGroups || input.hasExplicitGroupSelection) {
      await syncGroupMemberships(tenantId, existingStudent.id, input.groupIds);
    }

    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${existingStudent.id}`);
    revalidatePath("/teacher/groups");

    return {
      success: true,
      studentId: existingStudent.id,
    };
  } catch (error) {
    console.error("DB updateStudent failed:", error);

    return {
      success: false,
      message: "تعذر تحديث بيانات الطالب حاليًا",
    };
  }
}

export async function createStudent(formData: FormData): Promise<CreateStudentResult> {
  const tenant = await requireTenant();
  return createStudentForTenant(tenant.id, normalizeStudentInput(formData));
}

export async function updateStudent(
  studentIdOrFormData: string | FormData,
  maybeFormData?: FormData,
): Promise<UpdateStudentResult> {
  const tenant = await requireTenant();
  const formData = studentIdOrFormData instanceof FormData ? studentIdOrFormData : maybeFormData;

  if (!formData) {
    return {
      success: false,
      message: "تعذر تحديث بيانات الطالب",
    };
  }

  const studentIdOverride = typeof studentIdOrFormData === "string" ? studentIdOrFormData : undefined;
  return updateStudentForTenant(tenant.id, normalizeStudentInput(formData, studentIdOverride));
}

export async function bulkImport(_tenantId: string, records: Record<string, unknown>[]) {
  const tenant = await requireTenant();

  const results: Array<{ index: number; success: boolean; error?: string }> = [];
  let created = 0;

  for (const [index, record] of records.entries()) {
    const formData = new FormData();
    formData.set("name", String(record.name ?? record.studentName ?? ""));
    formData.set("phone", String(record.phone ?? record.studentPhone ?? ""));
    formData.set("parentName", String(record.parentName ?? ""));
    formData.set("parentPhone", String(record.parentPhone ?? ""));
    formData.set("gradeLevel", String(record.gradeLevel ?? ""));
    formData.set("syncGroups", "true");

    if (record.groupId) {
      formData.append("groupIds", String(record.groupId));
    }

    const result = await createStudentForTenant(tenant.id, normalizeStudentInput(formData));
    if (result.success) {
      created += 1;
      results.push({ index, success: true });
    } else {
      results.push({ index, success: false, error: result.message ?? "تعذر إضافة الطالب" });
    }
  }

  return {
    total: records.length,
    created,
    failed: records.length - created,
    results,
  };
}

export async function syncStudentGroups(studentId: string, groupIds: string[]) {
  const tenant = await requireTenant();
  await syncGroupMemberships(tenant.id, studentId, groupIds);
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/teacher/groups");
}

export async function enrollInGroup(studentId: string, groupId: string) {
  const tenant = await requireTenant();
  const currentGroups = await db.groupStudent.findMany({
    where: {
      studentId,
      status: {
        in: ["ACTIVE", "WAITLIST"],
      },
      group: {
        tenantId: tenant.id,
      },
    },
    select: {
      groupId: true,
    },
  });

  await syncGroupMemberships(tenant.id, studentId, [...currentGroups.map((group) => group.groupId), groupId]);
  revalidatePath("/teacher/groups");
}

export async function removeFromGroup(studentId: string, groupId: string) {
  const tenant = await requireTenant();
  const currentGroups = await db.groupStudent.findMany({
    where: {
      studentId,
      status: {
        in: ["ACTIVE", "WAITLIST"],
      },
      group: {
        tenantId: tenant.id,
      },
    },
    select: {
      groupId: true,
    },
  });

  await syncGroupMemberships(
    tenant.id,
    studentId,
    currentGroups.map((group) => group.groupId).filter((currentGroupId) => currentGroupId !== groupId),
  );
  revalidatePath("/teacher/groups");
}

export async function deleteStudent(tenantId: string, studentId: string) {
  // 1. تحقق من ملكية الحساب للـ tenant
  const student = await db.user.findFirst({
    where: { id: studentId, tenantId, role: "STUDENT" },
  });

  if (!student) {
    throw new Error("الطالب غير موجود أو لا تملك صلاحية حذفه");
  }

  // 2. حذف العلاقات أولاً لتجنب مشاكل الـ Foreign Key
  await db.$transaction([
    db.groupStudent.deleteMany({ where: { studentId } }),
    db.parentStudent.deleteMany({ where: { studentId } }),
    db.attendance.deleteMany({ where: { studentId } }),
    db.payment.deleteMany({ where: { studentId } }),
    db.user.delete({ where: { id: studentId } }),
  ]);

  revalidatePath("/teacher/students");
  revalidatePath("/teacher/groups");

  return { success: true };
}

export async function findStudentByPhone(phone: string): Promise<{
  found: boolean;
  student?: { id: string; name: string; phone: string; gradeLevel: string | null };
  message?: string;
}> {
  try {
    const tenant = await requireTenant();
    const normalized = normalizeEgyptPhone(phone.trim());

    if (!/^01\d{9}$/.test(normalized)) {
      return { found: false, message: "رقم الهاتف غير صحيح" };
    }

    const student = await db.user.findFirst({
      where: { tenantId: tenant.id, phone: normalized, role: "STUDENT" },
      select: { id: true, name: true, phone: true, gradeLevel: true },
    });

    if (!student) {
      return { found: false };
    }

    return {
      found: true,
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone.startsWith("student-") ? "" : student.phone,
        gradeLevel: student.gradeLevel,
      },
    };
  } catch (error) {
    console.error("findStudentByPhone failed:", error);
    return { found: false, message: "تعذر البحث حاليًا" };
  }
}

export async function enrollExistingStudent(studentId: string, groupId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const tenant = await requireTenant();

    const student = await db.user.findFirst({
      where: { id: studentId, tenantId: tenant.id, role: "STUDENT" },
      select: { id: true },
    });

    if (!student) {
      return { success: false, message: "الطالب غير موجود" };
    }

    await enrollInGroup(studentId, groupId);
    return { success: true };
  } catch (error) {
    console.error("enrollExistingStudent failed:", error);
    return { success: false, message: "تعذر إضافة الطالب للمجموعة" };
  }
}