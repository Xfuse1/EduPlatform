import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const checkinSchema = z.object({
  token: z.string().min(10).max(10),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = checkinSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const { token, phone } = result.data;

    // تحديد هوية الطالب — إما عن طريق الـ session أو الـ phone
    let student: { id: string; name: string; tenantId: string } | null = null;

    const sessionUser = await getCurrentUser();
    if (sessionUser?.role === "STUDENT") {
      student = sessionUser;
    } else if (phone) {
      const found = await db.user.findFirst({
        where: { phone, role: "STUDENT" },
        select: { id: true, name: true, tenantId: true },
      });
      if (!found) {
        return NextResponse.json({ error: "رقم الموبايل غير مسجل" }, { status: 404 });
      }
      student = found;
    } else {
      // مش logged in ومفيش phone → اطلب الـ phone
      return NextResponse.json({ code: "PHONE_REQUIRED" }, { status: 200 });
    }

    const now = new Date();

    // جلب الـ session بالـ token
    const session = await db.session.findUnique({
      where: { qrToken: token },
      include: {
        group: {
          include: {
            groupStudents: {
              where: { studentId: student.id, status: "ACTIVE" },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "رمز QR غير صالح" }, { status: 404 });
    }
    if (session.qrExpiresAt && session.qrExpiresAt < now) {
      return NextResponse.json({ error: "انتهت صلاحية رمز QR" }, { status: 400 });
    }
    if (session.group.groupStudents.length === 0) {
      return NextResponse.json({ error: "أنت غير مسجل في هذه المجموعة" }, { status: 403 });
    }

    // تسجيل الحضور
    await db.attendance.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
      update: { status: "PRESENT", method: "QR", markedAt: now },
      create: {
        tenantId: session.tenantId,
        sessionId: session.id,
        groupId: session.groupId,
        studentId: student.id,
        status: "PRESENT",
        method: "QR",
        markedAt: now,
      },
    });

    // إشعار ولي الأمر
    const parentLink = await db.parentStudent.findFirst({
      where: { studentId: student.id },
      include: { parent: true },
    });
    if (parentLink?.parent) {
      await db.notification.create({
        data: {
          tenantId: session.tenantId,
          userId: parentLink.parentId,
          type: "ATTENDANCE_PRESENT",
          message: `تم تسجيل حضور ${student.name} في حصة ${session.group.name} بنجاح.`,
          channel: "PUSH",
          recipientPhone: parentLink.parent.phone,
          status: "QUEUED",
        },
      });
    }

    return NextResponse.json({ success: true, studentName: student.name });

  } catch (error) {
    console.error("QR Check-in failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
