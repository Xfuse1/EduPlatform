import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const markSchema = z.object({
  studentId: z.string().cuid().or(z.string().min(1)),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await requireAuth();

    if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { sessionId } = await params;
    const body = await req.json();
    const result = markSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid status or studentId" }, { status: 400 });
    }

    const { studentId, status } = result.data;

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        group: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Upsert attendance
    const attendance = await db.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
      update: {
        status,
        method: "MANUAL",
        markedById: user.id,
        markedAt: new Date(),
      },
      create: {
        tenantId: session.tenantId,
        sessionId,
        groupId: session.groupId,
        studentId,
        status,
        method: "MANUAL",
        markedById: user.id,
        markedAt: new Date(),
      },
      include: {
        student: {
          select: { name: true, phone: true },
        },
      },
    });

    // Notify parent
    const parentLink = await db.parentStudent.findFirst({
      where: { studentId: studentId },
      include: { parent: true },
    });

    if (parentLink?.parent) {
      const type = status === "ABSENT" ? "ATTENDANCE_ABSENT" : "ATTENDANCE_PRESENT";
      const statusAr = status === "PRESENT" ? "حاضراً" : status === "ABSENT" ? "غائباً" : "متأخراً";

      await db.notification.create({
        data: {
          tenantId: session.tenantId,
          userId: parentLink.parentId,
          type: type,
          message: `تم تسجيل الطالب ${attendance.student.name} ${statusAr} في حصة ${session.group.name}.`,
          channel: "PUSH",
          recipientPhone: parentLink.parent.phone,
          status: "QUEUED",
        },
      });
    }

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error("Manual check-in failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
