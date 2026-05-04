import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { setSessionAutoEndNote } from "@/modules/attendance/sessionStatus";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const tenant = await requireTenant();
    const user = await requireAuth();
    const { sessionId } = await params;

    const role = String(user.role);
    if (role === "STUDENT" || role === "PARENT") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتعديل إعدادات الحصة." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body?.enabled);

    const session = await db.session.findFirst({
      where: { id: sessionId, tenantId: tenant.id },
      select: { id: true, notes: true },
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
        notes: setSessionAutoEndNote(session.notes, enabled),
      },
    });

    return NextResponse.json({ success: true, autoEndEnabled: enabled });
  } catch (error) {
    console.error("[ATTENDANCE_AUTO_END_SETTING]", error);
    return NextResponse.json(
      { success: false, error: "فشل تعديل إعدادات انتهاء الحصة." },
      { status: 500 },
    );
  }
}
