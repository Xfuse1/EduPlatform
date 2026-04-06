'use client';

import { Bell, CheckCheck, CircleAlert, CheckCircle, XCircle, BookOpen, Star, CreditCard, Calendar, LucideIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { showToast } from "@/components/ui/Toast";

// --- Types ---

export type NotificationType = 
  | "ATTENDANCE_PRESENT" 
  | "ATTENDANCE_ABSENT" 
  | "ASSIGNMENT_DUE" 
  | "GRADE_ADDED" 
  | "PAYMENT_DUE" 
  | "CLASS_REMINDER" 
  | "SCHEDULE_CHANGED";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  createdAt: Date;
  isRead: boolean;
};

// --- Mock Data ---
// TODO: replace with fetch('/api/notifications')
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "ATTENDANCE_PRESENT",
    title: "تم تسجيل حضورك في حصة الجبر",
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    isRead: false,
  },
  {
    id: "n2",
    type: "ASSIGNMENT_DUE",
    title: "موعد تسليم واجب الفيزياء غداً",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isRead: false,
  },
  {
    id: "n3",
    type: "GRADE_ADDED",
    title: "تم رصد درجة اختبار اللغة العربية",
    description: "حصلت على 18/20 في اختبار النصوص",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    isRead: true,
  },
  {
    id: "n4",
    type: "PAYMENT_DUE",
    title: "تذكير: موعد سداد مصروفات شهر أبريل",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: false,
  },
  {
    id: "n5",
    type: "SCHEDULE_CHANGED",
    title: "تغيير موعد حصة الكيمياء",
    description: "تم نقل الحصة من الثلاثاء إلى الأربعاء 4 مساءً",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    isRead: true,
  },
  {
    id: "n6",
    type: "CLASS_REMINDER",
    title: "تبدأ حصة الإنجليزية بعد 30 دقيقة",
    createdAt: new Date(Date.now() - 1000 * 60 * 20), // 20 mins ago
    isRead: false,
  },
];

const NOTIFICATION_CONFIG: Record<NotificationType, { icon: LucideIcon; color: string; bgColor: string }> = {
  ATTENDANCE_PRESENT: { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  ATTENDANCE_ABSENT: { icon: XCircle, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  ASSIGNMENT_DUE: { icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  GRADE_ADDED: { icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  PAYMENT_DUE: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  CLASS_REMINDER: { icon: Bell, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  SCHEDULE_CHANGED: { icon: Calendar, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900" },
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    showToast.success("تم تحديد الإشعارات كمقروءة");
  };

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="الإشعارات"
        className="touch-target relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-secondary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="absolute end-0 top-14 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-slate-100 bg-white/95 backdrop-blur-sm shadow-2xl dark:border-slate-800 dark:bg-slate-950/95 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">الإشعارات</h3>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">لديك {unreadCount} تنبيهات غير مقروءة</p>
              </div>
              <button 
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                اقرأ الكل
              </button>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50 dark:divide-slate-900">
                  {notifications.slice(0, 10).map((n) => {
                    const Config = NOTIFICATION_CONFIG[n.type];
                    return (
                      <div 
                        key={n.id} 
                        className={cn(
                          "group relative p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer overflow-hidden",
                          !n.isRead && "bg-primary/5 dark:bg-sky-400/5"
                        )}
                      >
                        {!n.isRead && <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />}
                        <div className="flex gap-4">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900", Config.bgColor, Config.color)}>
                            <Config.icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn("text-xs font-bold leading-tight", !n.isRead ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                                {n.title}
                              </p>
                              <span className="text-[9px] font-medium text-slate-400 shrink-0">
                                {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ar })}
                              </span>
                            </div>
                            {n.description && (
                              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                                {n.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 mb-3">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">لا توجد إشعارات حالياً</p>
                  <p className="text-xs text-slate-500 mt-1">سنخبرك عندما يصلك شيء جديد</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
              <Link 
                href="/notifications" 
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-950 py-2.5 text-xs font-bold text-slate-600 shadow-sm border border-slate-200 dark:border-slate-800 hover:text-primary transition-colors"
              >
                عرض كل الإشعارات
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
