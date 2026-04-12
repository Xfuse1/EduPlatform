import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "الاسم يجب أن يكون حرفين على الأقل" }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STUDENT_SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "فشل تحديث البيانات" }, { status: 500 });
  }
}
