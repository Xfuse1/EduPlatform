import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { ensureQrBillingBeforeAttendance, incrementMonthlyConsumption } from "@/modules/groups/billing";

async function findActiveSessionByToken(tenantId: string, token: string) {
  const now = new Date();

  return db.session.findFirst({
    where: {
      tenantId,
      qrToken: token,
      qrExpiresAt: { gt: now },
      status: "IN_PROGRESS",
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          groupStudents: {
            where: { status: "ACTIVE" },
            select: { studentId: true },
          },
        },
      },
      attendances: {
        where: {
          status: { in: ["PRESENT", "LATE"] },
          method: { in: ["QR", "QR_GUEST"] },
        },
        select: { studentId: true },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ success: false, error: "رمز غير صالح." }, { status: 400 });
    }

    const session = await findActiveSessionByToken(tenant.id, token);
    if (!session) {
      return NextResponse.json({ success: false, error: "الكود غير صالح أو منتهي." }, { status: 404 });
    }

    const user = await getCurrentUser();
    const canCheckin = Boolean(user && user.role === "STUDENT" && user.tenantId === tenant.id);
    const existingAttendance =
      canCheckin && user
        ? await db.attendance.findUnique({
            where: {
              sessionId_studentId: {
                sessionId: session.id,
                studentId: user.id,
              },
            },
            select: {
              status: true,
            },
          })
        : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        groupName: session.group.name,
        date: session.date,
        timeStart: session.timeStart,
        timeEnd: session.timeEnd,
        expiresAt: session.qrExpiresAt,
        scanLimit: session.qrScanLimit,
        scanCount: new Set(session.attendances.map((attendance) => attendance.studentId)).size,
      },
      alreadyMarked: existingAttendance?.status === "PRESENT" || existingAttendance?.status === "LATE",
    });
  } catch (error) {
    console.error("[ATTENDANCE_QR_CHECKIN_GET]", error);
    return NextResponse.json({ success: false, error: "تعذر تحميل بيانات الحصة." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await requireTenant();
    const body = await req.json();
    const token = String(body?.token ?? "").trim();

    if (!token) {
      return NextResponse.json({ success: false, error: "رمز غير صالح." }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, code: "AUTH_REQUIRED", error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "تسجيل الحضور متاح للطلاب فقط." }, { status: 403 });
    }

    if (user.tenantId !== tenant.id) {
      return NextResponse.json({ success: false, error: "الحساب غير تابع لنفس السنتر." }, { status: 403 });
    }

    const session = await findActiveSessionByToken(tenant.id, token);
    if (!session) {
      return NextResponse.json({ success: false, error: "الكود غير صالح أو منتهي." }, { status: 404 });
    }

    const existingAttendance = await db.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: user.id,
        },
      },
      select: { status: true },
    });

    if (existingAttendance?.status === "PRESENT" || existingAttendance?.status === "LATE") {
      return NextResponse.json({ success: true, studentName: user.name, alreadyMarked: true });
    }

    const scanCount = new Set(session.attendances.map((attendance) => attendance.studentId)).size;
    if (session.qrScanLimit && scanCount >= session.qrScanLimit) {
      return NextResponse.json({ success: false, error: "تم الوصول للعدد المسموح به لهذا الـ QR." }, { status: 409 });
    }

    const now = new Date();
    const isGuest = !session.group.groupStudents.some((gs) => gs.studentId === user.id);

    await db.$transaction(async (tx) => {
      await ensureQrBillingBeforeAttendance({
        tenantId: tenant.id,
        sessionId: session.id,
        studentId: user.id,
        tx,
      });

      await tx.attendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: user.id,
          },
        },
        update: {
          status: "PRESENT",
          method: isGuest ? "QR_GUEST" : "QR",
          markedAt: now,
          synced: true,
        },
        create: {
          tenantId: tenant.id,
          sessionId: session.id,
          groupId: session.group.id,
          studentId: user.id,
          status: "PRESENT",
          method: isGuest ? "QR_GUEST" : "QR",
          markedAt: now,
          synced: true,
        },
      });

      await incrementMonthlyConsumption({
        tenantId: tenant.id,
        groupId: session.group.id,
        studentId: user.id,
        tx,
      });
    });

    return NextResponse.json({
      success: true,
      studentName: user.name,
      isGuest,
    });
  } catch (error) {
    console.error("[ATTENDANCE_QR_CHECKIN_POST]", error);
    return NextResponse.json({ success: false, error: "فشل تسجيل الحضور عبر QR." }, { status: 500 });
  }
}
