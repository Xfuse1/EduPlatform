'use server';

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/config/routes";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const enrollSchema = z.object({
  groupId: z.string().trim().min(1, "المجموعة مطلوبة"),
});

/**
 * Student self-enroll into a group.
 * If the group is full the student is placed on the WAITLIST.
 */
export async function enrollStudentInGroup(input: { groupId: string }) {
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    return {
      success: false,
      message: "هذه العملية متاحة للطلاب فقط",
    };
  }

  const parsed = enrollSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات الانضمام غير صحيحة",
    };
  }

  try {
    const group = await db.group.findFirst({
      where: {
        id: parsed.data.groupId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        maxCapacity: true,
        tenantId: true,
      },
    });

    if (!group) {
      return {
        success: false,
        message: "المجموعة المطلوبة غير متاحة.",
      };
    }

    // Check existing enrollment
    const existingEnrollment = await db.groupStudent.findUnique({
      where: {
        groupId_studentId: {
          groupId: group.id,
          studentId: user.id,
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
        message: "أنت منضم بالفعل إلى هذه المجموعة.",
      };
    }

    if (existingEnrollment?.status === "WAITLIST") {
      return {
        success: false,
        message: "أنت موجود بالفعل في قائمة انتظار هذه المجموعة.",
      };
    }

    const activeEnrollmentCount = await db.groupStudent.count({
      where: {
        groupId: group.id,
        status: "ACTIVE",
      },
    });

    const nextStatus = activeEnrollmentCount >= group.maxCapacity ? "WAITLIST" : "PENDING";
    // Students self-enrolling always go to WAITLIST pending teacher approval

    await db.$transaction(async (tx) => {
      if (existingEnrollment) {
        await tx.groupStudent.update({
          where: { id: existingEnrollment.id },
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
          studentId: user.id,
          status: nextStatus,
        },
      });
    });

    revalidatePath(ROUTES.student.dashboard);
    revalidatePath(ROUTES.student.schedule);
    revalidatePath(ROUTES.teacher.groups);
    revalidatePath(`${ROUTES.teacher.groups}/${group.id}`);

    return {
      success: true,
      message: `تم إرسال طلب الانضمام إلى مجموعة ${group.name} بنجاح. في انتظار موافقة المعلم.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "تعذر الانضمام إلى المجموعة الآن",
    };
  }
}
