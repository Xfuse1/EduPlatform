import { Clock3 } from "lucide-react";

import { InvoiceCard } from "@/components/data-display/InvoiceCard";
import { NotificationCenter } from "@/components/data-display/NotificationCenter";
import { ScheduleTimeline } from "@/components/data-display/ScheduleTimeline";
import { StudentProgressCard } from "@/components/data-display/StudentProgressCard";
import { Card, CardContent } from "@/components/ui/card";
import { formatArabicDate } from "@/lib/utils";

type StudentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getStudentDashboardData>>;
};

export function StudentDashboard({ data }: StudentDashboardProps) {
  const groups = data.profile?.enrollments ?? [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,_#132238,_#1A5276_45%,_#2E86C1)] text-white">
        <CardContent className="p-6">
          <p className="text-start text-sm font-semibold text-white/75">البطاقة اليومية</p>
          {data.nextSession ? (
            <div className="mt-4 space-y-3">
              <p className="text-2xl font-extrabold">{data.nextSession.group.name}</p>
              <p className="text-sm text-white/85">{formatArabicDate(data.nextSession.date)}</p>
              <p className="flex items-center gap-2 text-sm text-white/85">
                <Clock3 className="h-4 w-4" />
                <span dir="ltr">
                  {data.nextSession.timeStart} - {data.nextSession.timeEnd}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/80">لا توجد حصة قادمة مسجلة الآن.</p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <StudentProgressCard
          attendanceRate={data.attendance.rate}
          homeworkCompletion={82}
          note="كل ما تحتاجه اليوم ظاهر أمامك: الحصة القادمة، التقدم، وحالة الاشتراك."
          streakLabel="سلسلة التزام 7 أيام"
          studentName={data.profile?.name ?? "الطالب"}
        />

        <InvoiceCard
          actionHref="/student/schedule"
          actionLabel="عرض الجدول"
          amount={data.payment.amount}
          description={data.payment.status === "PAID" ? "اشتراكك الحالي مغلق بالكامل ولا توجد مبالغ متبقية." : "يوجد مبلغ يحتاج متابعة مع إدارة السنتر."}
          dueDateLabel="متابعة هذا الشهر"
          invoiceNumber="STD-001"
          status={data.payment.status}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ScheduleTimeline
          items={groups.map((enrollment) => ({
            id: enrollment.group.id,
            title: enrollment.group.name,
            subtitle: "من مجموعاتي الحالية",
            dayLabel: enrollment.group.days.join(" • "),
            timeLabel: `${enrollment.group.timeStart} - ${enrollment.group.timeEnd}`,
            accentColor: "#2E86C1",
          }))}
          title="جدولي الثابت"
        />

        <NotificationCenter
          items={[
            {
              id: "student-note-1",
              title: "تذكير ذكي",
              description: data.nextSession ? `الحصة القادمة ${data.nextSession.group.name} ظهرت الآن في بطاقتك اليومية.` : "سيظهر أول تنبيه تلقائي بمجرد إضافة حصة جديدة.",
              isUnread: true,
              timeLabel: "الآن",
            },
            {
              id: "student-note-2",
              title: "متابعة الأداء",
              description: `نسبة حضورك الحالية ${data.attendance.rate}%، استمر بنفس النسق هذا الأسبوع.`,
              timeLabel: "هذا الأسبوع",
            },
          ]}
          title="تنبيهاتك"
        />
      </section>
    </div>
  );
}
