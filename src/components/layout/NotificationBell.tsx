'use client';

import { Bell, CheckCheck, CircleAlert, CreditCard, Users } from "lucide-react";
import { useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  icon: "payments" | "groups" | "alerts";
};

const notifications: NotificationItem[] = [
  {
    id: "notification-1",
    title: "دفعة جديدة تحتاج مراجعة",
    description: "تم تسجيل دفعة لطالب في مجموعة ثانية ثانوي.",
    icon: "payments",
  },
  {
    id: "notification-2",
    title: "مجموعة اقتربت من الامتلاء",
    description: "بقي ٦ مقاعد فقط في مجموعة ثالثة ثانوي.",
    icon: "groups",
  },
  {
    id: "notification-3",
    title: "تنبيه حضور",
    description: "هناك حصة جارية الآن وتحتاج متابعة الحضور.",
    icon: "alerts",
  },
];

function NotificationIcon({ icon }: { icon: NotificationItem["icon"] }) {
  if (icon === "payments") {
    return <CreditCard className="h-4 w-4" />;
  }

  if (icon === "groups") {
    return <Users className="h-4 w-4" />;
  }

  return <CircleAlert className="h-4 w-4" />;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="الإشعارات"
        className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-secondary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Bell className="h-5 w-5" />
      </button>

      {isOpen ? (
        <>
          <button
            aria-label="إغلاق الإشعارات"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="absolute start-0 top-14 z-40 w-[320px] max-w-[calc(100vw-2rem)] rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-extrabold text-slate-900 dark:text-white">الإشعارات</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">آخر المستجدات داخل المنصة</p>
              </div>
              <button
                className="touch-target inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary dark:bg-sky-400/10 dark:text-sky-300"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <CheckCheck className="h-4 w-4" />
                تم
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-[16px] bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300">
                      <NotificationIcon icon={notification.icon} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{notification.title}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{notification.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
