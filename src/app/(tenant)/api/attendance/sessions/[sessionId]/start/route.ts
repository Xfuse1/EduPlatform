import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { completeExpiredSession, getSessionAutoEndEnabled, isSessionPastEnd } from "@/modules/attendance/sessionStatus";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const tenant = await requireTenant();
    const user = await requireAuth();
    const { sessionId } = await params;
    const body = await req.json().catch(() => ({}));
    const scanLimitRaw = Number(body?.scanLimit ?? 0);
    const scanLimit = Number.isInteger(scanLimitRaw) && scanLimitRaw > 0 ? scanLimitRaw : null;

    const role = String(user.role);
    if (role === "STUDENT" || role === "PARENT") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك ببدء الحصة." },
        { status: 403 }
      );
    }

    const session = await db.session.findFirst({
      where: { id: sessionId, tenantId: tenant.id },
      select: { id: true, date: true, timeEnd: true, status: true, notes: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "الحصة غير موجودة." },
        { status: 404 }
      );
    }

    const currentSession = await completeExpiredSession(session);
    if (currentSession.status === "COMPLETED" || (getSessionAutoEndEnabled(currentSession) && isSessionPastEnd(currentSession))) {
      return NextResponse.json(
        { success: false, error: "لا يمكن بدء أو تجديد QR بعد انتهاء موعد الحصة." },
        { status: 409 }
      );
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.session.update({
      where: { id: currentSession.id },
      data: {
        status: "IN_PROGRESS",
        qrToken: token,
        qrExpiresAt: expiresAt,
        qrScanLimit: scanLimit,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      scanLimit,
    });
  } catch (error) {
    console.error("[ATTENDANCE_START_SESSION]", error);
    return NextResponse.json(
      { success: false, error: "فشل بدء الحصة." },
      { status: 500 }
    );
  }
}

