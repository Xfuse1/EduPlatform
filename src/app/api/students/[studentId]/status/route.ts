import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  const user = await getCurrentUser();
  if (!user || !["TEACHER", "ASSISTANT"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, groupId } = await req.json();

    if (groupId) {
      // تحديث حالة الانضمام للمجموعة مع تفعيل الدفع إذا لزم الأمر
      await db.$transaction(async (tx) => {
        const student = await tx.user.findUnique({
          where: { id: studentId },
          select: { tenantId: true }
        });

        if (!student) throw new Error("الطالب غير موجود");

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
            tenantId: student.tenantId,
            groupId,
            studentId,
            tx
          });
        }
      });
    } else {
      // تحديث حالة الطالب العامة
      await db.user.update({
        where: { id: studentId },
        data: { isActive: status === "ACTIVE" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STUDENT_STATUS_PATCH]", error);
    return NextResponse.json({ error: "فشل تحديث الحالة" }, { status: 500 });
  }
}
