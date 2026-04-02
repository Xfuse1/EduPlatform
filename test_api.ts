import { db } from "./src/lib/db";

async function test() {
  const user = { id: "u1", tenantId: "t1" }; // Mock user like I did in route.ts
  try {
    console.log("Fetching messages...");
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
    console.log("Found", messages.length, "messages");
    
    const conversationMap = new Map();
    for (const msg of messages) {
      const isSender = msg.senderId === user.id;
      const contact = isSender ? msg.receiver : msg.sender;
      if (!conversationMap.has(contact.id)) {
        conversationMap.set(contact.id, {
          id: contact.id,
          participant: {
            id: contact.id,
            name: contact.name,
            role: contact.role,
            avatar: contact.avatarUrl
          },
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
          messages: []
        });
      }
      const conv = conversationMap.get(contact.id);
      conv.messages.unshift({ id: msg.id, text: msg.text, senderId: isSender ? "me" : msg.senderId, createdAt: msg.createdAt });
      if (!isSender && !msg.readAt) conv.unreadCount++;
    }
    console.log("Conversations:", JSON.stringify(Array.from(conversationMap.values()), null, 2));
  } catch (error: any) {
    console.error("DEEP ERROR FOUND:");
    console.error(error.message);
    console.error(error.stack);
  }
}

test();
