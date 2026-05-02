'use client';

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, GraduationCap, MapPin, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { enrollStudentInGroup } from "@/modules/student/actions";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCapacity, formatCurrency, formatTimeRange12Hour, toArabicDigits } from "@/lib/utils";

type TeacherLandingProps = {
  teacher: {
    name: string;
    slug: string;
    logoUrl: string | null;
    themeColor: string;
    region: string | null;
    bio: string | null;
    subjects: string[];
  };
  groups: Array<{
    id: string;
    name: string;
    days: string[];
    timeStart: string;
    timeEnd: string;
    monthlyFee: number;
    enrolledCount: number;
    maxCapacity: number;
    remainingCapacity: number;
    isFull: boolean;
    color?: string;
  }>;
};

export function TeacherLanding({ 
  teacher, 
  groups, 
  currentUserId, 
  isStudent 
}: TeacherLandingProps & { 
  currentUserId?: string; 
  isStudent?: boolean; 
}) {
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handleEnroll(groupId: string) {
    setLoadingId(groupId);
    startTransition(async () => {
      const result = await enrollStudentInGroup({ groupId });
      if (result.success) {
        setEnrolledIds(prev => new Set([...prev, groupId]));
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setLoadingId(null);
    });
  }
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.18),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef4f8_100%)] px-4 py-6 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.12),_transparent_20%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)]">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="overflow-hidden rounded-[32px] border border-white/30 bg-[linear-gradient(135deg,_#1A5276,_#2E86C1_55%,_#8ecae6)] text-white shadow-[0_24px_60px_rgba(26,82,118,0.2)]">
          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                صفحة تعريف احترافية للطلاب وأولياء الأمور
              </div>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">{teacher.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/90">
                {teacher.bio ?? "خبرة عملية في تأسيس ومتابعة الطلاب مع نظام واضح للحضور والتحصيل والمتابعة المنتظمة."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4" />
                  {teacher.region ?? "غير محدد"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4" />
                  متابعة وحضور وتقارير
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {teacher.subjects.map((subject) => (
                  <span key={subject} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-primary">
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/12 p-6 backdrop-blur">
              <div
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/25 bg-white/20 text-3xl font-extrabold"
                style={{ backgroundColor: `${teacher.themeColor}55` }}
              >
                {teacher.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={teacher.name} className="h-full w-full rounded-full object-cover" src={teacher.logoUrl} />
                ) : (
                  teacher.name.slice(0, 1)
                )}
              </div>
              <p className="mt-6 text-center text-sm leading-7 text-white/85" suppressHydrationWarning>استعرض المجموعات المفتوحة وحدد أفضل موعد للانضمام مباشرة.</p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-slate-100"
                  href="/register"
                >
                  أنا طالب — سجّل الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/30"
                  href="/parent-register"
                >
                  أنا ولي أمر — سجّل ابنك
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white" suppressHydrationWarning>المجموعات المتاحة</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">اطلع على السعة المتبقية والرسوم والجدول لكل مجموعة.</p>
          </div>
          <Link className="hidden rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white sm:inline-flex" href="/register">
            ابدأ التسجيل
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const progress = Math.round((group.enrolledCount / group.maxCapacity) * 100);

            return (
              <Card key={group.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: group.color ?? teacher.themeColor }} />
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white" suppressHydrationWarning>{group.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.days.map((day) => (
                          <span
                            key={day}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-2 text-xs font-bold ${
                        group.isFull
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}
                    >
                      {group.isFull ? "ممتلئة" : "متاحة"}
                    </span>
                  </div>

                  <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4" />
                    <span dir="ltr">
                      {formatTimeRange12Hour(group.timeStart, group.timeEnd)}
                    </span>
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-extrabold text-primary dark:text-sky-300">{formatCurrency(group.monthlyFee)}</p>
                    <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Users className="h-4 w-4" />
                      <span dir="ltr">{formatCapacity(group.enrolledCount, group.maxCapacity)}</span>
                    </p>
                  </div>

                  <Progress className="h-2.5" value={progress} />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    الأماكن المتبقية: <span dir="ltr">{toArabicDigits(group.remainingCapacity)}</span>
                  </p>

                  {isStudent ? (
                    <button
                      type="button"
                      disabled={group.isFull || enrolledIds.has(group.id) || loadingId === group.id}
                      onClick={() => handleEnroll(group.id)}
                      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
                        group.isFull || enrolledIds.has(group.id)
                          ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                          : "bg-gradient-to-l from-primary to-secondary text-white hover:opacity-90"
                      }`}
                    >
                      {loadingId === group.id ? "جاري الانضمام..." :
                       enrolledIds.has(group.id) ? "✅ تم الانضمام" :
                       group.isFull ? "القائمة ممتلئة" : "انضم لهذه المجموعة"}
                    </button>
                  ) : (
                    <Link
                      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
                        group.isFull
                          ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                          : "bg-gradient-to-l from-primary to-secondary text-white"
                      }`}
                      href={group.isFull ? "#" : "/register"}
                    >
                      {group.isFull ? "القائمة ممتلئة" : "سجّل في هذه المجموعة"}
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
