import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const checkinSchema = z.object({
  token: z.string().min(10).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = checkinSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const { token } = result.data;
    const now = new Date();

    // Find the session that has this token
    const session = await db.session.findUnique({
      where: { qrToken: token },
      include: {
        group: {
          include: {
            students: {
              where: {
                studentId: user.id,
                status: "ACTIVE",
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    }

    if (session.qrExpiresAt && session.qrExpiresAt < now) {
      return NextResponse.json({ error: "QR token expired" }, { status: 400 });
    }

    // Check enrollment
    if (session.group.students.length === 0) {
      return NextResponse.json({ error: "Not enrolled in this group" }, { status: 403 });
    }

    // Register attendance (upsert to handle duplication or pre-existing ABSENT)
    await db.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: user.id,
        },
      },
      update: {
        status: "PRESENT",
        method: "QR",
        markedAt: now,
      },
      create: {
        tenantId: session.tenantId,
        sessionId: session.id,
        groupId: session.groupId,
        studentId: user.id,
        status: "PRESENT",
        method: "QR",
        markedAt: now,
      },
    });

    // Notification for parent will be triggered here
    // Finding parent
    const parentLink = await db.parentStudent.findFirst({
      where: { studentId: user.id },
      include: { parent: true },
    });

    if (parentLink?.parent) {
      await db.notification.create({
        data: {
          tenantId: session.tenantId,
          userId: parentLink.parentId,
          type: "ATTENDANCE_PRESENT",
          message: `تم تسجيل حضور الابن ${user.name} في حصة ${session.group.name} بنجاح.`,
          channel: "PUSH",
          recipientPhone: parentLink.parent.phone,
          status: "QUEUED",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QR Check-in failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
