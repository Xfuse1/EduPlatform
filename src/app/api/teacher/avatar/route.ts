import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !["TEACHER", "ASSISTANT"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { avatarUrl } = await req.json();

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "رابط الصورة غير صحيح" }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_AVATAR_PATCH]", error);
    return NextResponse.json({ error: "فشل تحديث الصورة" }, { status: 500 });
  }
}
