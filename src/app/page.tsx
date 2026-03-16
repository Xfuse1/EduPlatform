import Link from "next/link";
import { ArrowLeft, Check, CreditCard, MessageSquareQuote, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/config/plans";

const features = [
  { title: "إدارة الحضور", description: "متابعة الحصص والغياب والتأخير من شاشة واضحة وسريعة.", icon: ShieldCheck, color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { title: "تحصيل المصاريف", description: "عرض واضح للمدفوع والمتأخر مع مؤشرات بصرية فورية.", icon: CreditCard, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { title: "إشعارات للأهالي", description: "تجربة تواصل منظمة مع أولياء الأمور والطلاب.", icon: Users, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.18),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef4f8_45%,_#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.12),_transparent_20%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)]">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,_#10324B,_#1A5276_45%,_#2E86C1_80%,_#dceffe_130%)] text-white shadow-[0_30px_80px_rgba(26,82,118,0.25)]">
          <div className="grid gap-10 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                منصة متخصصة لإدارة السناتر في مصر
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">حوّل إدارة سنترك إلى تجربة أنيقة وسريعة وواضحة.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/88">
                متابعة الحضور، تحصيل المصاريف، تنظيم الجداول، وتجربة احترافية للمعلمين والطلاب وأولياء الأمور في مكان واحد.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-slate-100" href="/login">
                  ابدأ الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15" href="/register">
                  شاهد نموذج التسجيل
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/15 bg-white/12 p-5 backdrop-blur sm:col-span-2">
                <p className="text-sm text-white/75">نظرة سريعة</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-3xl font-extrabold">+١٢٠</p>
                    <p className="mt-2 text-sm text-white/75">طالب تحت المتابعة</p>
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold">٩٢٪</p>
                    <p className="mt-2 text-sm text-white/75">متوسط حضور شهري</p>
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold">٢٤/٧</p>
                    <p className="mt-2 text-sm text-white/75">وصول من كل الأجهزة</p>
                  </div>
                </div>
              </div>
              {features.slice(0, 2).map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.title} className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-lg font-bold">{feature.title}</p>
                    <p className="mt-2 text-sm leading-7 text-white/80">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardContent className="space-y-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h2>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">الأسعار</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">خطط مرنة تناسب المعلمين والمراكز التعليمية.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {PLAN_LIMITS.map((plan, index) => (
              <Card key={plan.name} className={index === 1 ? "border-primary ring-2 ring-primary/20" : ""}>
                <CardContent className="space-y-5">
                  {index === 1 ? (
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-sky-400/10 dark:text-sky-300">
                      الخطة الموصى بها
                    </span>
                  ) : null}
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="mt-2 text-3xl font-extrabold text-primary dark:text-sky-300">{plan.price}</p>
                  </div>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{plan.description}</p>
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <p key={feature} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span>{feature}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/70">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300">
            <MessageSquareQuote className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">آراء المستخدمين</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">مساحة مخصصة لعرض شهادات العملاء وتجاربهم قريباً.</p>
        </section>

        <footer className="rounded-[28px] border bg-white/85 px-6 py-5 text-center text-sm text-slate-500 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
          EduPlatform © جميع الحقوق محفوظة
        </footer>
      </div>
    </main>
  );
}
