'use server';

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { buildPhoneConflictMessage, findUserByPhone, isPhoneUniqueConstraintError } from "@/lib/user-phone";
import { phoneSchema } from "@/modules/auth/validations";

const optionalEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
  },
  z.string().email("البريد الإلكتروني غير صحيح").optional(),
);

const optionalBioSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
  },
  z.string().max(500, "النبذة لا تتجاوز 500 حرف").optional(),
);

const createTeacherSchema = z.object({
  name: z.string().trim().min(3, "اسم المدرس مطلوب"),
  phone: phoneSchema,
  subject: z.string().trim().min(2, "المادة مطلوبة").max(100, "المادة لا تتجاوز 100 حرف"),
  email: optionalEmailSchema,
  bio: optionalBioSchema,
});

const deleteTeacherSchema = z.object({
  id: z.string().trim().min(1, "المدرس غير محدد"),
});

export async function createTeacher(input: z.infer<typeof createTeacherSchema>) {
  const user = await requireAuth();

  if (!["CENTER_ADMIN", "TEACHER", "ASSISTANT"].includes(user.role)) {
    return {
      success: false,
      message: "غير مصرح لك بإدارة المدرسين",
    };
  }

  const tenant = await requireTenant();

  if (tenant.accountType !== "CENTER") {
    return {
      success: false,
      message: "إدارة المدرسين متاحة فقط لحسابات السنتر",
    };
  }

  const parsed = createTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات المدرس غير صحيحة",
    };
  }

  const payload = parsed.data;
  const existingUser = await findUserByPhone(payload.phone);

  if (existingUser && (existingUser.isActive || existingUser.role !== "TEACHER" || existingUser.tenantId !== tenant.id)) {
    return {
      success: false,
      message: buildPhoneConflictMessage(existingUser.role),
    };
  }

  try {
    const teacher = existingUser
      ? await db.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            name: payload.name,
            role: "TEACHER",
            email: payload.email ?? null,
            subject: payload.subject,
            bio: payload.bio ?? null,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            subject: true,
            bio: true,
            createdAt: true,
            lastLoginAt: true,
          },
        })
      : await db.user.create({
          data: {
            tenantId: tenant.id,
            name: payload.name,
            phone: payload.phone,
            role: "TEACHER",
            email: payload.email ?? null,
            subject: payload.subject,
            bio: payload.bio ?? null,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            subject: true,
            bio: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });

    revalidatePath("/center/teachers");
    revalidatePath("/teacher");
    revalidatePath("/center");

    return {
      success: true,
      message: "تم إضافة المدرس وإنشاء حسابه تلقائيًا ويمكنه تسجيل الدخول برقم الهاتف.",
      teacher: {
        id: teacher.id,
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email,
        subject: teacher.subject,
        bio: teacher.bio,
        createdAt: teacher.createdAt.toISOString(),
        lastLoginAt: teacher.lastLoginAt?.toISOString() ?? null,
        groupsCount: 0,
        studentsCount: 0,
      },
    };
  } catch (error) {
    if (isPhoneUniqueConstraintError(error)) {
      return {
        success: false,
        message: buildPhoneConflictMessage(),
      };
    }

    throw error;
  }
}

export async function deleteTeacher(input: z.infer<typeof deleteTeacherSchema>) {
  const user = await requireAuth();

  if (!["CENTER_ADMIN", "TEACHER", "ASSISTANT"].includes(user.role)) {
    return {
      success: false,
      message: "غير مصرح لك بإدارة المدرسين",
    };
  }

  const tenant = await requireTenant();

  if (tenant.accountType !== "CENTER") {
    return {
      success: false,
      message: "إدارة المدرسين متاحة فقط لحسابات السنتر",
    };
  }

  const parsed = deleteTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "المدرس غير محدد",
    };
  }

  if (parsed.data.id === user.id) {
    return {
      success: false,
      message: "لا يمكن حذف حسابك الحالي من هذه الصفحة",
    };
  }

  const [teacher, activeTeachersCount] = await Promise.all([
    db.user.findFirst({
      where: {
        id: parsed.data.id,
        tenantId: tenant.id,
        role: "TEACHER",
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    db.user.count({
      where: {
        tenantId: tenant.id,
        role: "TEACHER",
        isActive: true,
      },
    }),
  ]);

  if (!teacher) {
    return {
      success: false,
      message: "المدرس غير متاح",
    };
  }

  if (activeTeachersCount <= 1) {
    return {
      success: false,
      message: "يجب الاحتفاظ بمدرس واحد على الأقل داخل السنتر",
    };
  }

  await db.$transaction([
    db.group.updateMany({
      where: {
        tenantId: tenant.id,
        teacherId: teacher.id,
      },
      data: {
        teacherId: null,
      },
    }),
    db.authSession.deleteMany({
      where: {
        userId: teacher.id,
      },
    }),
    db.user.update({
      where: {
        id: teacher.id,
      },
      data: {
        isActive: false,
      },
    }),
  ]);

  revalidatePath("/center/teachers");
  revalidatePath("/teacher");
  revalidatePath("/center");
  revalidatePath("/teacher/groups");

  return {
    success: true,
  };
}





