"use client"

import React, { useState, useEffect } from "react"
import { Bell, CheckCheck, CheckCircle, XCircle, BookOpen, Star, CreditCard, Calendar, Search, LucideIcon, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { showToast } from "@/components/ui/Toast"

type NotificationType =
  | "ATTENDANCE_PRESENT"
  | "ATTENDANCE_ABSENT"
  | "ASSIGNMENT_DUE"
  | "GRADE_ADDED"
  | "PAYMENT_DUE"
  | "PAYMENT_REMINDER"
  | "PAYMENT_OVERDUE"
  | "CLASS_REMINDER"
  | "SCHEDULE_CHANGED"
  | "ANNOUNCEMENT"
  | "EXAM_PUBLISHED"

interface NotificationItem {
  id: string
  type: NotificationType
  message: string
  createdAt: string
  isRead: boolean
  status: string
}

type TabModule = "all" | "attendance" | "assignments" | "payments" | "schedule"

function getModule(type: NotificationType): TabModule {
  if (type === "ATTENDANCE_PRESENT" || type === "ATTENDANCE_ABSENT") return "attendance"
  if (type === "ASSIGNMENT_DUE" || type === "GRADE_ADDED" || type === "EXAM_PUBLISHED") return "assignments"
  if (type === "PAYMENT_DUE" || type === "PAYMENT_REMINDER" || type === "PAYMENT_OVERDUE") return "payments"
  if (type === "SCHEDULE_CHANGED" || type === "CLASS_REMINDER") return "schedule"
  return "all"
}

const NOTIFICATION_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  ATTENDANCE_PRESENT: { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  ATTENDANCE_ABSENT: { icon: XCircle, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  ASSIGNMENT_DUE: { icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  GRADE_ADDED: { icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  EXAM_PUBLISHED: { icon: BookOpen, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  PAYMENT_DUE: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  PAYMENT_REMINDER: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  PAYMENT_OVERDUE: { icon: CreditCard, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  CLASS_REMINDER: { icon: Bell, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  SCHEDULE_CHANGED: { icon: Calendar, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900" },
  ANNOUNCEMENT: { icon: Bell, color: "text-sky-600", bgColor: "bg-sky-50 dark:bg-sky-950/30" },
}

const DEFAULT_CONFIG = { icon: Bell, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900" }

async function patchRead(ids: string[]) {
  await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabModule>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch("/api/notifications")
        if (!res.ok) return
        const data = await res.json()
        setNotifications(data)
      } catch {
        // silently ignore
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = notifications.filter(n => {
    const module = getModule(n.type)
    const matchesTab = activeTab === "all" || module === activeTab
    const matchesSearch = n.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    try {
      await patchRead([id])
    } catch {
      // silently ignore
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (!unreadIds.length) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try {
      await patchRead(unreadIds)
      showToast.success("تم تحديد جميع الإشعارات كمقروءة")
    } catch {
      showToast.error("فشل تحديث الإشعارات")
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-8 sm:gap-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">مركز الإشعارات</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : "كل الإشعارات مقروءة"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="gap-2 rounded-xl min-h-10 px-4"
        >
          <CheckCheck className="h-4 w-4" />
          تحديد الكل كمقروء
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Search and Filters */}
        <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4 md:flex-row md:items-center">
          <div className="relative w-full md:w-[350px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ابحث في الإشعارات..."
              className="pr-10 rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabModule)} className="w-full md:w-auto">
            <TabsList className="w-full justify-start gap-1 rounded-xl bg-slate-50 p-1 dark:bg-slate-900 md:w-auto">
              <TabsTrigger value="all" className="rounded-lg px-4">الكل</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg px-4">الحضور</TabsTrigger>
              <TabsTrigger value="assignments" className="rounded-lg px-4">الواجبات</TabsTrigger>
              <TabsTrigger value="payments" className="rounded-lg px-4">المدفوعات</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-lg px-4">الجدول</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-3">
            {filtered.map((n) => {
              const config = NOTIFICATION_CONFIG[n.type] ?? DEFAULT_CONFIG
              const module = getModule(n.type)
              return (
                <Card
                  key={n.id}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-[18px] border-none shadow-sm transition-all hover:shadow-md sm:rounded-[24px]",
                    !n.isRead ? "bg-white dark:bg-slate-950 ring-1 ring-primary/20" : "bg-white/60 dark:bg-slate-950/60 opacity-80"
                  )}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  {!n.isRead && <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-primary" />}
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-5">
                        <div className={cn("hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", config.bgColor, config.color)}>
                          <config.icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={cn("flex sm:hidden h-6 w-6 shrink-0 items-center justify-center rounded-full", config.bgColor, config.color)}>
                              <config.icon className="h-3 w-3" />
                            </div>
                            <h3 className={cn("font-bold text-base", !n.isRead ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                              {n.message}
                            </h3>
                            {!n.isRead && (
                              <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold h-5 border-none px-2 rounded-full">جديد</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 pt-1">
                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                            </span>
                            {module !== "all" && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">#{module}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!n.isRead && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-primary font-bold hover:bg-primary/5 rounded-xl hidden md:flex min-h-9 px-3 py-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(n.id)
                          }}
                        >
                          تحديد كمقروء
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center rounded-[24px] border-dashed bg-slate-50/50 p-8 text-center dark:bg-slate-900/10 sm:rounded-[40px] sm:p-20">
            <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 mb-6">
              <Bell className="h-10 w-10" />
            </div>
            <CardHeader className="p-0">
              <CardTitle className="text-xl font-extrabold text-slate-400 sm:text-2xl">لا توجد إشعارات</CardTitle>
              <CardDescription className="mt-2 text-base sm:text-lg">
                {searchQuery || activeTab !== "all" ? "لم نعثر على إشعارات تطابق الفلتر الحالي." : "لا توجد إشعارات حتى الآن."}
              </CardDescription>
            </CardHeader>
            {(searchQuery || activeTab !== "all") && (
              <Button
                type="button"
                variant="ghost"
                className="mt-4 text-primary font-bold text-base underline"
                onClick={() => {
                  setSearchQuery("")
                  setActiveTab("all")
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
