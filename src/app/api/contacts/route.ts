import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const users = await db.user.findMany({
      where: { 
        tenantId: user.tenantId, 
        id: { not: user.id },
        role: { not: 'STUDENT' } 
      },
      select: { id: true, name: true, role: true, avatarUrl: true }
    });

    const contacts = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      role: u.role === "TEACHER" ? "المدرس" : u.role === "PARENT" ? "ولي أمر" : "طالب",
      avatar: u.avatarUrl
    }));

    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
