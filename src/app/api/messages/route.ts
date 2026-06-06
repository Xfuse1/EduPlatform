import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedContactIds } from "@/lib/contacts";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { receiverId, text } = body;

    if (!receiverId || typeof receiverId !== "string" || !text) {
      return NextResponse.json({ error: "Missing receiverId or text" }, { status: 400 });
    }

    if (typeof text !== "string" || text.length > 5000) {
      return NextResponse.json({ error: "Invalid message text" }, { status: 400 });
    }

    // SECURITY: the receiver must be an ALLOWED CONTACT (relationship-based).
    // Messaging is cross-tenant by design for parent<->teacher, so we validate
    // the relationship — not same-tenant — which still blocks arbitrary/admin
    // targeting and cross-tenant spam.
    const allowed = await getAllowedContactIds(user);
    if (!allowed.has(receiverId)) {
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
