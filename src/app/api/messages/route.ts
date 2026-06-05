import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { receiverId, text } = body;

    if (!receiverId || !text) {
      return NextResponse.json({ error: "Missing receiverId or text" }, { status: 400 });
    }

    if (typeof text !== "string" || text.length > 5000) {
      return NextResponse.json({ error: "Invalid message text" }, { status: 400 });
    }

    // تأكد أن المستقبِل تابع لنفس الـ tenant (منع التراسل عبر المراكز)
    const receiver = await db.user.findFirst({
      where: { id: receiverId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!receiver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await db.message.create({
      data: {
        tenantId: user.tenantId,
        senderId: user.id,
        receiverId,
        text
      }
    });

    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
