import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

type JoinRequestNotification = {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  message: string;
  channel: string;
  status: string;
  recipientPhone: string;
  sentAt: Date | null;
  errorMessage: string | null;
  retries: number;
  createdAt: Date;
  meta: {
    groupId: string;
    groupName: string;
    studentName: string;
  };
};

// Cap on the merged response so a large backlog of join requests cannot starve
// real DB notifications out of the list.
const MERGED_NOTIFICATIONS_LIMIT = 50;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // إشعارات قاعدة البيانات العادية
  const notifications = await db.notification.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
      status: true,
    },
  });

  // ✅ إضافة طلبات الانضمام المعلقة للمعلم فقط
  let joinRequests: JoinRequestNotification[] = [];

  if (user.role === "TEACHER") {
    const pending = await db.groupStudent.findMany({
      where: {
        group: { 
          tenantId: user.tenantId,
          teacherId: user.id 
        },
        status: { in: ["PENDING", "WAITLIST"] },
      },
      include: {
        student: { select: { name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: 20,
    });

    // تحويلها لنفس شكل الإشعار العادي
    joinRequests = pending.map((p) => ({
      id: `join_${p.id}`,
      tenantId: user.tenantId,
      userId: user.id,
      type: "NEW_JOIN_REQUEST",
      message: `${p.student.name} يطلب الانضمام إلى ${p.group.name}`,
      channel: "PUSH",
      status: "QUEUED",
      recipientPhone: "",
      sentAt: null,
      errorMessage: null,
      retries: 0,
      createdAt: p.enrolledAt,
      // ✅ بيانات إضافية للـ UI
      meta: {
        groupId: p.group.id,
        groupName: p.group.name,
        studentName: p.student.name,
      },
    }));
  }

  // دمج الإشعارات وترتيبها بالأحدث أولاً
  const merged = [...joinRequests, ...notifications.map((notification) => ({
    ...notification,
    isRead: notification.status !== "QUEUED",
  }))]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MERGED_NOTIFICATIONS_LIMIT);

  return NextResponse.json(merged);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ids } = await req.json();

    // ✅ تجاهل الـ ids الخاصة بطلبات الانضمام (تبدأ بـ "join_")
    const realIds = Array.isArray(ids)
      ? ids.filter((id: string) => !id.startsWith("join_"))
      : [];

    if (realIds?.length > 0) {
      await db.notification.updateMany({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          id: { in: realIds },
        },
        data: { status: "SENT" },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
}

