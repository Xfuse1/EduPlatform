'use client';

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, GraduationCap, MapPin, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { enrollStudentInGroup } from "@/modules/student/actions";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCapacity, formatCurrency, formatTimeRange12Hour, toArabicDigits } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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
    <main className="relative min-h-screen overflow-hidden bg-transparent font-[Cairo] text-slate-900 dark:text-white" dir="rtl">
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.05); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 10s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
      `}</style>

      {/* Background SVG Wisps - Ultra-Premium, Flowy, and Luxe */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="luxe-blur-1">
              <feGaussianBlur stdDeviation="30" />
            </filter>
            <filter id="luxe-blur-2">
              <feGaussianBlur stdDeviation="60" />
            </filter>
            <linearGradient id="luxe-gradient-1" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#818cf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="luxe-gradient-2" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="animate-pulse-slow opacity-30 dark:opacity-60" style={{ mixBlendMode: "screen" }}>
            <path 
              d="M-100,300 C200,100 400,700 700,400 S900,900 1200,600" 
              fill="none" 
              stroke="url(#luxe-gradient-1)" 
              strokeWidth="80" 
              filter="url(#luxe-blur-2)" 
              className="animate-float-slow"
            />
            <path 
              d="M-200,600 C100,400 500,900 800,500 S1100,100 1300,300" 
              fill="none" 
              stroke="url(#luxe-gradient-2)" 
              strokeWidth="100" 
              filter="url(#luxe-blur-1)" 
              className="animate-float-slow" 
              style={{ animationDelay: "-2s" }}
            />
          </g>
        </svg>
      </div>

      {/* Texture Overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />

      {/* Floating blurred blobs */}
      <div className="absolute left-[5%] top-[15%] h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[150px]" />
      <div className="absolute bottom-[-15%] right-[0%] h-[600px] w-[600px] rounded-full bg-indigo-900/10 blur-[180px]" />

      <div className="absolute left-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <section className="relative z-10 mx-auto max-w-6xl space-y-6 px-3 py-10 sm:space-y-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="overflow-hidden rounded-[22px] border-2 border-slate-300/80 bg-white/70 text-slate-900 shadow-[0_8px_40px_rgb(0,0,0,0.08)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 dark:text-white sm:rounded-[32px]">
          <div className="grid gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
            <div>
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold dark:bg-white/15 sm:px-4 sm:text-sm">
                <Sparkles className="h-4 w-4" />
                صفحة تعريف احترافية للطلاب وأولياء الأمور
              </div>
              <h1 className="mt-5 break-words text-3xl font-extrabold leading-tight sm:text-5xl">{teacher.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/90">
                {teacher.bio ?? "خبرة عملية في تأسيس ومتابعة الطلاب مع نظام واضح للحضور والتحصيل والمتابعة المنتظمة."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-slate-100 px-4 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/15">
                  <MapPin className="h-4 w-4" />
                  {teacher.region ?? "غير محدد"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-slate-100 px-4 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/15">
                  <GraduationCap className="h-4 w-4" />
                  متابعة وحضور وتقارير
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {teacher.subjects.map((subject) => (
                  <span key={subject} className="rounded-full border border-slate-300/80 bg-white px-4 py-2 text-sm font-bold text-primary dark:border-white/20 dark:bg-slate-900 dark:text-sky-400">
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] bg-slate-100/50 p-4 backdrop-blur dark:bg-white/12 sm:rounded-[28px] sm:p-6">
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
              <p className="mt-6 text-center text-sm leading-7 text-slate-500 dark:text-white/85" suppressHydrationWarning>استعرض المجموعات المفتوحة وحدد أفضل موعد للانضمام مباشرة.</p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-slate-100 shadow-sm"
                  href={`/${teacher.slug}/register`}
                >
                  أنا طالب — سجّل الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/20 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 dark:border-white/30 dark:text-white dark:hover:bg-white/30 shadow-sm"
                  href={`/${teacher.slug}/parent-register`}
                >
                  أنا ولي أمر — سجّل ابنك
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl" suppressHydrationWarning>المجموعات المتاحة</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/50">اطلع على السعة المتبقية والرسوم والجدول لكل مجموعة.</p>
          </div>
          <Link className="hidden rounded-xl bg-[#00B8A0] px-5 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(0,184,160,0.3)] transition hover:bg-[#00B8A0]/90 sm:inline-flex" href={`/${teacher.slug}/register`}>
            ابدأ التسجيل
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const progress = Math.round((group.enrolledCount / group.maxCapacity) * 100);

            return (
              <Card key={group.id} className="overflow-hidden border-2 border-slate-300/80 bg-white/70 shadow-lg backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_20px_rgba(0,184,160,0.1)]">
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                    <div className="min-w-0">
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
                          : "bg-[#00B8A0] text-white"
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

                  <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
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
                          : "bg-gradient-to-l from-[#1A2B6D] to-[#00B8A0] text-white hover:opacity-90 shadow-lg shadow-[#00B8A0]/10"
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
                          : "bg-gradient-to-l from-[#1A2B6D] to-[#00B8A0] text-white shadow-lg shadow-[#00B8A0]/10"
                      }`}
                      href={group.isFull ? "#" : `/${teacher.slug}/register`}
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
