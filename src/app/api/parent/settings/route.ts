import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PARENT") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const data = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, phone: true, avatarUrl: true, email: true, settings: true },
  });

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PARENT") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { name, email, avatarUrl, settings } = await req.json();

    if (name && (typeof name !== "string" || name.trim().length < 2)) {
      return NextResponse.json({ error: "الاسم يجب أن يكون حرفين على الأقل" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { 
        ...(name && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(settings !== undefined && { settings }),
      },
      select: { id: true, name: true, phone: true, avatarUrl: true, email: true, settings: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PARENT_SETTINGS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
