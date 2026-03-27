export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { MessageThread } from "@/components/data-display/MessageThread";
import { NotificationCenter } from "@/components/data-display/NotificationCenter";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getNotificationLogs } from "@/modules/notifications/queries";

export default async function CenterAnnouncementsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const logs = await getNotificationLogs(tenant.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <NotificationCenter
        items={logs.slice(0, 8).map((item) => ({
          id: item.id,
          title: item.type,
          description: item.message,
          timeLabel: item.createdAt.toLocaleDateString("ar-EG"),
          channelLabel: item.channel,
          isUnread: item.status !== "DELIVERED",
        }))}
        title="آخر الإعلانات والإرسال"
      />

      <MessageThread
        messages={[
          {
            id: "msg-1",
            sender: "إدارة السنتر",
            body: "تم تعديل قاعة مجموعة ثالثة ثانوي إلى قاعة 3 وسيصل إشعار تلقائي الآن.",
            timeLabel: "09:10",
            isOwn: true,
          },
          {
            id: "msg-2",
            sender: "فريق المتابعة",
            body: "تمت المراجعة، وسجلات التسليم تظهر نجاح الإرسال لمعظم أولياء الأمور.",
            timeLabel: "09:18",
            isOwn: false,
          },
        ]}
        title="قناة الرسائل الرسمية"
      />
    </div>
  );
}
