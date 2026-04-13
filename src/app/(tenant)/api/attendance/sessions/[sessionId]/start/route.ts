import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const tenant = await requireTenant();
    const user = await requireAuth();
    const { sessionId } = await params;

    const role = String(user.role);
    if (role === "STUDENT" || role === "PARENT") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك ببدء الحصة." },
        { status: 403 }
      );
    }

    const session = await db.session.findFirst({
      where: { id: sessionId, tenantId: tenant.id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "الحصة غير موجودة." },
        { status: 404 }
      );
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.session.update({
      where: { id: session.id },
      data: {
        status: "IN_PROGRESS",
        qrToken: token,
        qrExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[ATTENDANCE_START_SESSION]", error);
    return NextResponse.json(
      { success: false, error: "فشل بدء الحصة." },
      { status: 500 }
    );
  }
}

