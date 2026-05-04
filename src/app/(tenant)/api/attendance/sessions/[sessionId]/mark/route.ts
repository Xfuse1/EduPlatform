import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { completeExpiredSession } from "@/modules/attendance/sessionStatus";

const ALLOWED_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const tenant = await requireTenant();
    const user = await requireAuth();
    const { sessionId } = await params;

    const role = String(user.role);
    if (role === "STUDENT" || role === "PARENT") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتسجيل الحضور." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const studentId = String(body?.studentId ?? "").trim();
    const status = String(body?.status ?? "").trim().toUpperCase();

    if (!studentId || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json(
        { success: false, error: "بيانات تسجيل الحضور غير صحيحة." },
        { status: 400 }
      );
    }

    const session = await db.session.findFirst({
      where: { id: sessionId, tenantId: tenant.id },
      select: { id: true, groupId: true, date: true, timeEnd: true, status: true, notes: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "الحصة غير موجودة." },
        { status: 404 }
      );
    }

    const currentSession = await completeExpiredSession(session);
    if (currentSession.status === "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعديل الحضور بعد انتهاء الحصة." },
        { status: 409 }
      );
    }

    await db.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: currentSession.id,
          studentId,
        },
      },
      update: {
        status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        method: "MANUAL",
        markedAt: new Date(),
        markedById: user.id,
        synced: true,
      },
      create: {
        tenantId: tenant.id,
        sessionId: currentSession.id,
        groupId: currentSession.groupId,
        studentId,
        status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        method: "MANUAL",
        markedAt: new Date(),
        markedById: user.id,
        synced: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ATTENDANCE_MARK_STUDENT]", error);
    return NextResponse.json(
      { success: false, error: "فشل تسجيل حضور الطالب." },
      { status: 500 }
    );
  }
}

