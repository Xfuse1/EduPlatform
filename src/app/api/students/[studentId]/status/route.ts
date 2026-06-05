import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRole, STAFF_ROLES } from "@/lib/permissions";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";

const ALLOWED_STATUSES = ["ACTIVE", "REJECTED"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  const user = await getCurrentUser();
  if (!user || !checkRole(user.role, STAFF_ROLES)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await requireTenant();
    const teacherScopeUserId = getTeacherScopeUserId(tenant, user);
    const { status, groupId } = await req.json();

    // تحقق من الحالة المسموح بها فقط
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "حالة غير صحيحة" }, { status: 400 });
    }

    // تأكد أن الطالب يخص هذا الـ tenant
    const student = await db.user.findFirst({
      where: { id: studentId, tenantId: tenant.id, role: "STUDENT" },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    if (groupId) {
      // تأكد أن المجموعة تخص هذا الـ tenant (وملكية المعلم) قبل التعديل
      const group = await db.group.findFirst({
        where: {
          id: groupId,
          tenantId: tenant.id,
          ...(teacherScopeUserId ? { teacherId: teacherScopeUserId } : {}),
        },
        select: { id: true },
      });

      if (!group) {
        return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });
      }

      // تحديث حالة الانضمام للمجموعة مع تفعيل الدفع إذا لزم الأمر
      await db.$transaction(async (tx) => {
        const existingEnrollment = await tx.groupStudent.findUnique({
          where: {
            groupId_studentId: {
              groupId,
              studentId
            }
          },
          select: { status: true }
        });

        await tx.groupStudent.updateMany({
          where: {
            studentId: studentId,
            groupId: groupId,
          },
          data: {
            status: status === "ACTIVE" ? "ACTIVE" : "REJECTED",
          },
        });

        if (status === "ACTIVE" && existingEnrollment?.status === "PENDING") {
          const { chargeGroupEnrollmentIfNeeded } = await import("@/modules/groups/billing");
          await chargeGroupEnrollmentIfNeeded({
            tenantId: tenant.id,
            groupId,
            studentId,
            tx
          });
        }
      });
    } else {
      // تحديث حالة الطالب العامة
      await db.user.updateMany({
        where: { id: studentId, tenantId: tenant.id, role: "STUDENT" },
        data: { isActive: status === "ACTIVE" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STUDENT_STATUS_PATCH]", error);
    return NextResponse.json({ error: "فشل تحديث الحالة" }, { status: 500 });
  }
}
