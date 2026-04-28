export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getParentChildren } from "@/modules/students/queries";
import { getStudentAttendanceSnapshot } from "@/modules/attendance/queries";
import { Calendar, User, Filter, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toArabicDigits, cn } from "@/lib/utils"

// --- Types ---

interface AttendanceRecord {
  id: string
  date: string
  groupName: string
  teacherName: string
  status: "PRESENT" | "ABSENT" | "LATE"
}

interface Child {
  id: string
  name: string
}

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: { childId?: string };
}) {
  const user = await requireAuth();
  if (user.role !== "PARENT") redirect("/student");

  const tenant = await requireTenant();
  const childrenData = await getParentChildren(tenant.id, user.id);
  const children = childrenData.map((pc: any) => ({ id: pc.student.id, name: pc.student.name }));

  const selectedChild =
    childrenData.find((pc: any) => pc.student.id === searchParams.childId) ??
    childrenData[0];
  const selectedChildId = selectedChild?.student.id;

  if (!selectedChild || !selectedChildId || children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground" dir="rtl">
        لا يوجد أبناء مسجلين
      </div>
    );
  }

  const attendanceTenantId =
    selectedChild.student.groupStudents?.find((enrollment: any) => enrollment.status === "ACTIVE")?.group?.tenantId ??
    selectedChild.student.groupStudents?.[0]?.group?.tenantId ??
    selectedChild.student.tenantId;
  const attendance = await getStudentAttendanceSnapshot(attendanceTenantId, selectedChildId);
  const attendanceData = (attendance.records ?? []).map((r: any) => ({
    id: r.id,
    date: new Date(r.session.date).toLocaleDateString("ar-EG"),
    groupName: r.group?.name ?? "—",
    teacherName: "—",
    status: r.status as "PRESENT" | "ABSENT" | "LATE",
  }));

  const presentCount = attendanceData.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
  const totalCount = attendanceData.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-5xl mx-auto w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل الحضور</h1>
          <p className="text-muted-foreground mt-1">تابع مواعيد حضور وغياب أبنائك بالتفصيل</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2 rounded-2xl border shadow-sm">
          <User className="h-4 w-4 text-primary mr-2" />
          <form method="get">
            <select
              name="childId"
              defaultValue={selectedChildId}
              className="border-none bg-transparent focus:ring-0 font-bold min-w-[150px] outline-none"
              onChange={undefined}
            >
              {children.map((child: any) => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
            <button type="submit" className="text-xs text-primary underline mr-2">عرض</button>
          </form>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardContent className="p-6">
            <p className="text-white/70 text-sm font-medium">نسبة الالتزام</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold">{toArabicDigits(attendanceRate)}%</span>
              <span className="text-xs text-white/60">هذا الشهر</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-6">
            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">إجمالي الحضور</p>
            <div className="mt-2 text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">
              {toArabicDigits(presentCount)} <span className="text-xs font-normal opacity-60">جلسة</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-6">
            <p className="text-rose-600 dark:text-rose-400 text-sm font-bold">إجمالي الغياب</p>
            <div className="mt-2 text-2xl font-extrabold text-rose-800 dark:text-rose-300">
              {toArabicDigits(totalCount - presentCount)} <span className="text-xs font-normal opacity-60">جلسة</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="border-none shadow-md overflow-hidden rounded-[32px]">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between p-6">
          <CardTitle className="text-lg font-bold">تفاصيل السجل</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select 
              defaultValue="03"
              className="h-9 rounded-xl text-xs bg-transparent"
            >
              <option value="03">مارس 2026</option>
              <option value="02">فبراير 2026</option>
              <option value="01">يناير 2026</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b">التاريخ</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b">المجموعة</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b">المدرس</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                {attendanceData.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{record.date}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{record.groupName}</td>
                    <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{record.teacherName}</td>
                    <td className="p-4">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: AttendanceRecord["status"] }) {
  switch (status) {
    case "PRESENT":
      return (
        <Badge variant="success" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          حضر
        </Badge>
      )
    case "ABSENT":
      return (
        <Badge variant="destructive" className="gap-1 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300">
          <XCircle className="h-3 w-3" />
          غاب
        </Badge>
      )
    case "LATE":
      return (
        <Badge variant="warning" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          متأخر
        </Badge>
      )
    default:
      return null
  }
}
