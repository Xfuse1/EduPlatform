"use client"

import React, { useState } from "react"
import { Bell, CheckCheck, CheckCircle, XCircle, BookOpen, Star, CreditCard, Calendar, Search, Filter, LucideIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { showToast } from "@/components/ui/Toast"

// --- Types ---

type NotificationType = 
  | "ATTENDANCE_PRESENT" 
  | "ATTENDANCE_ABSENT" 
  | "ASSIGNMENT_DUE" 
  | "GRADE_ADDED" 
  | "PAYMENT_DUE" 
  | "CLASS_REMINDER" 
  | "SCHEDULE_CHANGED";

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  description?: string
  createdAt: Date
  isRead: boolean
  module: "attendance" | "assignments" | "payments" | "schedule" | "general"
}

// --- Mock Data ---

const generateMockNotifications = (): NotificationItem[] => {
  const types: NotificationType[] = [
    "ATTENDANCE_PRESENT", "ATTENDANCE_ABSENT", "ASSIGNMENT_DUE", 
    "GRADE_ADDED", "PAYMENT_DUE", "CLASS_REMINDER", "SCHEDULE_CHANGED"
  ]
  const modules: NotificationItem["module"][] = ["attendance", "assignments", "payments", "schedule", "general"]
  
  return Array.from({ length: 20 }).map((_, i) => {
    const type = types[i % types.length]
    let module: NotificationItem["module"] = "general"
    if (type.startsWith("ATTENDANCE")) module = "attendance"
    else if (type.includes("ASSIGNMENT") || type === "GRADE_ADDED") module = "assignments"
    else if (type === "PAYMENT_DUE") module = "payments"
    else if (type === "SCHEDULE_CHANGED" || type === "CLASS_REMINDER") module = "schedule"

    return {
      id: `n-${i}`,
      type,
      module,
      title: `إشعار تجريبي رقم ${i + 1}: ${type}`,
      description: i % 3 === 0 ? "هذا وصف تجريبي للإشعار يوضح تفاصيل أكثر حول التنبيه المرسل للمستخدم." : undefined,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * (i * 2 + 1)), // staggered times
      isRead: i > 5,
    }
  })
}

const MOCK_NOTIFICATIONS = generateMockNotifications()

const NOTIFICATION_CONFIG: Record<NotificationType, { icon: LucideIcon; color: string; bgColor: string }> = {
  ATTENDANCE_PRESENT: { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  ATTENDANCE_ABSENT: { icon: XCircle, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  ASSIGNMENT_DUE: { icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  GRADE_ADDED: { icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  PAYMENT_DUE: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  CLASS_REMINDER: { icon: Bell, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  SCHEDULE_CHANGED: { icon: Calendar, color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-900" },
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const filteredNotifications = notifications.filter(n => {
    const matchesTab = activeTab === "all" || n.module === activeTab
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (n.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    return matchesTab && matchesSearch
  })

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })))
    showToast.success("تم تحديد جميع الإشعارات كمقروءة")
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-5xl mx-auto w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مركز الإشعارات</h1>
          <p className="text-muted-foreground mt-1">تابع كل التنبيهات والتحديثات الخاصة بحسابك</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead} className="gap-2 rounded-xl min-h-10 px-4">
            <CheckCheck className="h-4 w-4" />
            تحديد الكل كمقروء
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="relative w-full md:w-[350px]">
            <Search className="absolute left-auto right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="ابحث في الإشعارات..." 
              className="pr-10 rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-slate-50 dark:bg-slate-900 rounded-xl p-1 gap-1">
              <TabsTrigger value="all" className="rounded-lg px-4">الكل</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg px-4">الحضور</TabsTrigger>
              <TabsTrigger value="assignments" className="rounded-lg px-4">الواجبات</TabsTrigger>
              <TabsTrigger value="payments" className="rounded-lg px-4">المدفوعات</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-lg px-4">الجدول</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            <div className="grid gap-3">
              {filteredNotifications.map((n) => {
                const Config = NOTIFICATION_CONFIG[n.type]
                return (
                  <Card 
                    key={n.id} 
                    className={cn(
                      "group border-none shadow-sm transition-all hover:shadow-md cursor-pointer rounded-[24px] overflow-hidden relative",
                      !n.isRead ? "bg-white dark:bg-slate-950 ring-1 ring-primary/20" : "bg-white/60 dark:bg-slate-950/60 opacity-80"
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    {!n.isRead && <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-primary" />}
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex gap-5 items-start">
                          <div className={cn("hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", Config.bgColor, Config.color)}>
                            <Config.icon className="h-6 w-6" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {/* Mobile Icon */}
                              <div className={cn("flex sm:hidden h-6 w-6 shrink-0 items-center justify-center rounded-full", Config.bgColor, Config.color)}>
                                <Config.icon className="h-3 w-3" />
                              </div>
                              <h3 className={cn("font-bold text-lg", !n.isRead ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                                {n.title}
                              </h3>
                              {!n.isRead && (
                                <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold h-5 border-none px-2 rounded-full">جديد</Badge>
                              )}
                            </div>
                            {n.description && (
                              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">
                                {n.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 pt-1">
                              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ar })}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">#{n.module}</span>
                            </div>
                          </div>
                        </div>
                        
                        {!n.isRead && (
                          <Button 
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
            <Card className="border-dashed flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-[40px]">
              <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 mb-6">
                <Bell className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-slate-400">لا توجد إشعارات</CardTitle>
              <CardDescription className="text-lg mt-2">عفواً، لم نعثر على أي إشعارات تطابق بحثك حالياً.</CardDescription>
              <Button 
                variant="ghost" 
                className="mt-4 text-primary font-bold text-lg underline" 
                onClick={() => {
                  setSearchQuery("")
                  setActiveTab("all")
                }}
              >
                مسح الفلاتر والعودة للبداية
              </Button>
            </Card>
          )}

          {/* Pagination Placeholder */}
          {filteredNotifications.length > 0 && (
            <div className="flex items-center justify-center py-10">
              <Button variant="outline" className="rounded-2xl px-10 py-6 text-sm font-bold border-2 hover:bg-slate-50 transition-all">
                تحميل المزيد من الإشعارات
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
