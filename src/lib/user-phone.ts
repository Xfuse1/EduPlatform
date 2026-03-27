import { Prisma, UserRole } from "@prisma/client";

import { db } from "@/lib/db";

const roleLabelMap: Record<UserRole, string> = {
  CENTER_ADMIN: "مدير سنتر",
  TEACHER: "مدرس",
  STUDENT: "طالب",
  PARENT: "ولي أمر",
  ASSISTANT: "مساعد",
};

export async function findUserByPhone(phone: string, currentUserId?: string) {
  return db.user.findFirst({
    where: {
      phone,
      ...(currentUserId
        ? {
            id: {
              not: currentUserId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      tenantId: true,
      role: true,
      isActive: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          isActive: true,
          accountType: true,
        },
      },
    },
  });
}

export function buildPhoneConflictMessage(role?: UserRole) {
  if (!role) {
    return "رقم الهاتف مستخدم بالفعل بحساب آخر. يجب أن يكون لكل حساب رقم هاتف مختلف.";
  }

  return `رقم الهاتف مستخدم بالفعل بحساب ${roleLabelMap[role]} آخر. يجب أن يكون لكل حساب رقم هاتف مختلف.`;
}

export function getUniqueConstraintTargets(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return [];
  }

  const targets = (error.meta as { target?: unknown } | undefined)?.target;

  return Array.isArray(targets) ? targets.filter((target): target is string => typeof target === "string") : [];
}

export function hasUniqueConstraintTarget(error: unknown, target: string) {
  return getUniqueConstraintTargets(error).includes(target);
}

export function isPhoneUniqueConstraintError(error: unknown) {
  return hasUniqueConstraintTarget(error, "phone");
}
