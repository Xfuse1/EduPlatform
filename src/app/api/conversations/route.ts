import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all messages where the user is sender or receiver. Ownership is the
    // (senderId|receiverId == user.id) boundary — NOT tenantId — because
    // parent<->teacher threads are cross-tenant by design (each side stamps the
    // message with its own tenant), so a tenant filter would hide half of them.
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, role: true, avatarUrl: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const conversationMap = new Map();

    for (const msg of messages) {
      const isSender = msg.senderId === user.id;
      const contact = isSender ? msg.receiver : msg.sender;
      
      if (!conversationMap.has(contact.id)) {
        conversationMap.set(contact.id, {
          id: contact.id, // the conversation id matches the contact id
          participant: {
            id: contact.id,
            name: contact.name,
            role: contact.role === "TEACHER" ? "المدرس" : contact.role === "PARENT" ? "ولي أمر" : "طالب",
            avatar: contact.avatarUrl
          },
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
          messages: []
        });
      }
      
      const conv = conversationMap.get(contact.id);
      
      conv.messages.unshift({
        id: msg.id,
        text: msg.text,
        senderId: isSender ? "me" : msg.senderId,
        createdAt: msg.createdAt
      });
      
      if (!isSender && !msg.readAt) {
        conv.unreadCount++;
      }
    }

    return NextResponse.json(Array.from(conversationMap.values()));
  } catch (error) {
    console.error("GET /api/conversations failed:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { contactId } = await request.json();

    if (!contactId || typeof contactId !== "string") {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    // Ownership boundary: only mark messages ADDRESSED TO the caller as read.
    // Scoped by receiverId === user.id (not tenantId) so cross-tenant
    // parent<->teacher threads can be marked read by their actual recipient.
    await db.message.updateMany({
      where: {
        senderId: contactId,
        receiverId: user.id,
        readAt: null
      },
      data: { readAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/conversations failed:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
