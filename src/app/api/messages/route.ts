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
