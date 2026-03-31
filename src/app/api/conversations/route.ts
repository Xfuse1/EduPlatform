import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    // const user = await requireAuth();
    const user = { id: "u1", tenantId: "t1" }; // Mock user for debugging

    // Fetch all messages where user is sender or receiver
    const messages = await db.message.findMany({
      where: {
        tenantId: user.tenantId,
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
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack  // أضف ده مؤقتاً
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const { contactId } = await request.json();

    await db.message.updateMany({
      where: {
        tenantId: user.tenantId,
        senderId: contactId,
        receiverId: user.id,
        readAt: null
      },
      data: { readAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
