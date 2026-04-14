import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  const user = await getCurrentUser();
  if (!user || !["TEACHER", "ASSISTANT"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, groupId } = await req.json();

    if (groupId) {
      // تحديث حالة الانضمام للمجموعة
      await db.groupStudent.updateMany({
        where: {
          studentId: params.studentId,
          groupId: groupId,
        },
        data: {
          status: status === "ACTIVE" ? "ACTIVE" : "REJECTED",
        },
      });
    } else {
      // تحديث حالة الطالب العامة
      await db.user.update({
        where: { id: params.studentId },
        data: { isActive: status === "ACTIVE" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STUDENT_STATUS_PATCH]", error);
    return NextResponse.json({ error: "فشل تحديث الحالة" }, { status: 500 });
  }
}
