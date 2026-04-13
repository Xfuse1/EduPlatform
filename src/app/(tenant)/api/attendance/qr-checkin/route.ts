import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { normalizeEgyptPhone } from "@/lib/phone";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    const tenant = await requireTenant();
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const rawPhone = String(body?.phone ?? "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "رمز غير صالح." },
        { status: 400 }
      );
    }

    const now = new Date();
    const session = await db.session.findFirst({
      where: {
        tenantId: tenant.id,
        qrToken: token,
        qrExpiresAt: { gt: now },
        status: "IN_PROGRESS",
      },
      include: {
        group: {
          select: {
            groupStudents: {
              where: { status: "ACTIVE" },
              select: { studentId: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "الكود غير صالح أو منتهي." },
        { status: 404 }
      );
    }

    if (!rawPhone) {
      return NextResponse.json({
        success: false,
        code: "PHONE_REQUIRED",
      });
    }

    const phone = normalizeEgyptPhone(rawPhone);
    const student = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: "STUDENT",
        phone,
      },
      select: { id: true, name: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "لا يوجد طالب بهذا الرقم." },
        { status: 404 }
      );
    }

    const isGuest = !session.group.groupStudents.some((gs) => gs.studentId === student.id);

    await db.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id,
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
        groupId: session.groupId,
        studentId: student.id,
        status: "PRESENT",
        method: isGuest ? "QR_GUEST" : "QR",
        markedAt: now,
        synced: true,
      },
    });

    return NextResponse.json({
      success: true,
      studentName: student.name,
      isGuest,
    });
  } catch (error) {
    console.error("[ATTENDANCE_QR_CHECKIN]", error);
    return NextResponse.json(
      { success: false, error: "فشل تسجيل الحضور عبر QR." },
      { status: 500 }
    );
  }
}

