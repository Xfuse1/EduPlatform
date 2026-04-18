'use client';

import { Bell, CheckCheck, CheckCircle, XCircle, BookOpen, Star, CreditCard, Calendar, LucideIcon, Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export type NotificationType =
  | "ATTENDANCE_PRESENT"
  | "ATTENDANCE_ABSENT"
  | "ASSIGNMENT_DUE"
  | "GRADE_ADDED"
  | "PAYMENT_DUE"
  | "CLASS_REMINDER"
  | "SCHEDULE_CHANGED"
  | "PAYMENT_REMINDER"
  | "PAYMENT_OVERDUE";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  status: string;
};

const NOTIFICATION_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  ATTENDANCE_PRESENT: { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  ATTENDANCE_ABSENT: { icon: XCircle, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  ASSIGNMENT_DUE: { icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  GRADE_ADDED: { icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  PAYMENT_DUE: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  PAYMENT_REMINDER: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  PAYMENT_OVERDUE: { icon: CreditCard, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  CLASS_REMINDER: { icon: Bell, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  SCHEDULE_CHANGED: { icon: Calendar, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900" },
};

const DEFAULT_CONFIG = { icon: Bell, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900" };

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !readIds.has(n.id) && n.status === "QUEUED").length;

  useEffect(() => {
    async function fetchNotifications() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    const newReadIds = new Set(notifications.map(n => n.id));
    setReadIds(newReadIds);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(newReadIds) }),
      });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
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
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  لديك {unreadCount} تنبيهات غير مقروءة
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 ml-2"
                  >
                    <CheckCheck className="h-3 w-3" />
                    اقرأ الكل
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
              {isLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-slate-50 dark:divide-slate-900">
                  {notifications.map((n) => {
                    const config = NOTIFICATION_CONFIG[n.type] ?? DEFAULT_CONFIG;
                    const isUnread = !readIds.has(n.id) && n.status === "QUEUED";
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "group relative p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer overflow-hidden",
                          isUnread && "bg-primary/5 dark:bg-sky-400/5"
                        )}
                        onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                      >
                        {isUnread && <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />}
                        <div className="flex gap-4">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900", config.bgColor, config.color)}>
                            <config.icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn("text-xs font-bold leading-tight", isUnread ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                                {n.message}
                              </p>
                              <span className="text-[9px] font-medium text-slate-400 shrink-0">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                              </span>
                            </div>
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
