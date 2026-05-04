import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const tenant = await requireTenant();
    const user = await requireAuth();
    const { sessionId } = await params;

    const role = String(user.role);
    if (role === "STUDENT" || role === "PARENT") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بإنهاء الحصة." },
        { status: 403 },
      );
    }

    const session = await db.session.findFirst({
      where: { id: sessionId, tenantId: tenant.id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "الحصة غير موجودة." },
        { status: 404 },
      );
    }

    await db.session.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        qrToken: null,
        qrExpiresAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("[ATTENDANCE_END_SESSION]", error);
    return NextResponse.json(
      { success: false, error: "فشل إنهاء الحصة." },
      { status: 500 },
    );
  }
}
