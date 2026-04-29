"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CreditCard,
  GraduationCap,
  Heart,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PLAN_LIMITS } from "@/config/plans";
import { MarketingFaq } from "@/modules/public-pages/components/MarketingFaq";

const features = [
  {
    title: "إدارة الحضور",
    description: "متابعة الحصص والغياب والتأخير من شاشة واضحة وسريعة.",
    icon: ShieldCheck,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    title: "تحصيل المصاريف",
    description: "عرض واضح للمدفوع والمتأخر مع مؤشرات بصرية فورية.",
    icon: CreditCard,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    title: "إشعارات للأهالي",
    description: "تجربة تواصل منظمة مع أولياء الأمور والطلاب.",
    icon: Users,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
] as const;

const navigationLinks = [
  { href: "#home", label: "الرئيسية" },
  { href: "#features", label: "المميزات" },
  { href: "#pricing", label: "الأسعار" },
  { href: "#about", label: "من نحن" },
] as const;

const heroStats = [
  { value: "+١٢٠", label: "طالب تحت المتابعة" },
  { value: "٩٢٪", label: "متوسط حضور شهري" },
  { value: "٢٤/٧", label: "وصول من كل الأجهزة" },
] as const;

const steps = [
  {
    number: "١",
    title: "سجّل حسابك",
    description: "أنشئ حسابك المجاني في أقل من دقيقة",
  },
  {
    number: "٢",
    title: "أضف مجموعاتك وطلابك",
    description: "استورد بياناتك أو أضف طلابك يدوياً",
  },
  {
    number: "٣",
    title: "ابدأ الإدارة الذكية",
    description: "تابع الحضور والمصاريف وأرسل إشعارات تلقائية",
  },
] as const;

const audienceCards = [
  {
    title: "للمعلم",
    icon: GraduationCap,
    iconClassName: "bg-[#2E86C1]/15 text-[#2E86C1]",
    borderClassName: "border-[#2E86C1]/30",
    accentClassName: "from-[#2E86C1]/20 to-transparent",
    badge: "إدارة لحظية",
    points: [
      "تتبع الحضور في ثوانٍ",
      "اعرف مين دفع ومين لأ",
      "إشعارات تلقائية للأهالي",
      "تقارير مالية واضحة",
    ],
  },
] as const;

const testimonials = [
  {
    name: "أ/ محمد حسن",
    role: "معلم رياضيات — القاهرة",
    text: "قبل المنصة كنت بضيع ساعتين يومياً في تتبع الحضور والمصاريف. دلوقتي خلصت في 5 دقايق.",
  },
  {
    name: "أ/ سارة أحمد",
    role: "مدرسة لغة إنجليزية — الإسكندرية",
    text: "الأهالي بقوا يسألوا أقل لأن الإشعارات بتوصلهم تلقائياً. وفّرت عليّ وقت ومجهود كتير.",
  },
  {
    name: "أ/ خالد عمر",
    role: "صاحب سنتر — سوهاج",
    text: "بقدر أتابع 3 معلمين و200 طالب من موبايلي. الريبورت الشهري بيتعمل لوحده.",
  },
] as const;

const footerGroups = [
  {
    title: "المنتج",
    links: [
      { href: "#features", label: "المميزات" },
      { href: "#pricing", label: "الأسعار" },
      { href: "#how-it-works", label: "كيف يعمل" },
    ],
  },
  {
    title: "الشركة",
    links: [
      { href: "#about", label: "من نحن" },
      { href: "#footer", label: "تواصل معنا" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { href: "#footer", label: "سياسة الخصوصية" },
      { href: "#footer", label: "الشروط والأحكام" },
    ],
  },
] as const;

export default function MarketingPage() {
  return (
    <main
      className="min-h-screen scroll-smooth bg-[#F8FAFC] font-[Cairo] text-[#1E293B] dark:bg-[#0F172A] dark:text-white"
      dir="rtl"
      id="home"
    >
      <div className="bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.12),_transparent_28%),linear-gradient(180deg,_#F8FAFC_0%,_#EEF4F8_48%,_#F8FAFC_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.2),_transparent_28%),linear-gradient(180deg,_#0F172A_0%,_#111827_48%,_#0F172A_100%)]">
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-extrabold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:bg-white/10 dark:text-white dark:shadow-[0_12px_30px_rgba(15,23,42,0.35)]">
                E
              </span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">EduPlatform</span>
            </div>

            <nav className="hidden items-center gap-6 lg:flex">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-white/75 dark:hover:text-white"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <ThemeToggle />
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-transparent px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                  href="/login"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(46,134,193,0.35)] transition hover:bg-secondary"
                  href="/signup"
                >
                  ابدأ مجاناً
                </Link>
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-transparent px-3 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                  href="/login"
                >
                  دخول
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-3 py-3 text-sm font-bold text-white transition hover:bg-secondary"
                  href="/signup"
                >
                  ابدأ
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,_#10324B,_#1A5276_45%,_#2E86C1_80%,_#dceffe_130%)] text-white shadow-[0_30px_80px_rgba(26,82,118,0.25)]">
            <div className="grid gap-8 px-5 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-16">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  منصة متخصصة لإدارة السناتر في مصر
                </div>
                <h1 className="mt-6 text-start text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                  حوّل إدارة سنترك إلى تجربة أنيقة وسريعة وواضحة.
                </h1>
                <p className="mt-5 max-w-2xl text-start text-base leading-8 text-white/88">
                  متابعة الحضور، تحصيل المصاريف، تنظيم الجداول، وتجربة احترافية للمعلم في مكان واحد.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-slate-100"
                    href="/signup"
                  >
                    ابدأ مجاناً — سجّل الآن
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                    href="#how-it-works"
                  >
                    شاهد كيف يعمل
                  </Link>
                </div>
              </div>

              <div className="order-1 grid gap-4 sm:grid-cols-2 lg:order-2">
                <div className="rounded-[28px] border border-white/15 bg-white/12 p-5 backdrop-blur sm:col-span-2">
                  <p className="text-start text-sm text-white/75">نظرة سريعة</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {heroStats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-start text-3xl font-extrabold">{stat.value}</p>
                        <p className="mt-2 text-start text-sm text-white/75">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {features.slice(0, 2).map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div key={feature.title} className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-start text-lg font-bold">{feature.title}</p>
                      <p className="mt-2 text-start text-sm leading-7 text-white/80">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="scroll-mt-20 rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm [&_.text-white]:text-slate-900 [&_.text-slate-300]:text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:[&_.text-slate-300]:text-slate-300 dark:[&_.text-white]:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-6 lg:p-8" id="features">
            <div className="max-w-2xl">
              <p className="text-start text-sm font-semibold text-sky-300">المميزات</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">كل ما تحتاجه في مكان واحد</h2>
              <p className="mt-3 text-start text-sm leading-7 text-slate-300 sm:text-base">
                منصة متكاملة تحل كل مشاكل إدارة السنتر
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Card key={feature.title} className="border-slate-200 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(2,6,23,0.28)]">
                    <CardContent className="space-y-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${feature.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-start text-xl font-bold text-white">{feature.title}</h3>
                      <p className="text-start text-sm leading-7 text-slate-300">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section
            className="scroll-mt-20 overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.92))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] [&_.text-white]:text-slate-900 [&_.text-slate-300]:text-slate-600 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(15,23,42,0.78))] dark:[&_.text-slate-300]:text-slate-300 dark:[&_.text-white]:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-6 lg:p-8"
            id="how-it-works"
          >
            <div className="max-w-2xl">
              <p className="text-start text-sm font-semibold text-sky-300">كيف يعمل</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">ابدأ في 3 خطوات بسيطة</h2>
            </div>

            <div className="relative mt-8 grid gap-5 lg:grid-cols-3">
              <div className="absolute inset-x-12 top-16 hidden h-px bg-gradient-to-l from-white/0 via-sky-400/40 to-white/0 lg:block" />
              {steps.map((step) => (
                <div key={step.number} className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-sky-400/12 text-3xl font-extrabold text-sky-300">
                    {step.number}
                  </div>
                  <h3 className="mt-5 text-start text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-3 text-start text-sm leading-7 text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center lg:justify-start">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-bold !text-slate-50 shadow-[0_16px_35px_rgba(46,134,193,0.35)] transition hover:bg-secondary hover:!text-white"
                href="/signup"
              >
                ابدأ الآن مجاناً
              </Link>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm [&_.text-white]:text-slate-900 [&_.text-slate-200]:text-slate-700 [&_.text-slate-300]:text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:[&_.text-slate-200]:text-slate-200 dark:[&_.text-slate-300]:text-slate-300 dark:[&_.text-white]:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-6 lg:p-8">
            <div className="max-w-2xl">
              <p className="text-start text-sm font-semibold text-sky-300">أدوات ذكية للمعلم</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">منصة مصممة لخدمة المعلم</h2>
              <p className="mt-3 text-start text-sm leading-7 text-slate-300 sm:text-base">كل ما تحتاجه لإدارة مجموعاتك بتركيز</p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {audienceCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Card
                    key={card.title}
                    className={`group relative overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(15,23,42,0.12)] dark:bg-[linear-gradient(180deg,rgba(20,30,49,0.98)_0%,rgba(18,27,44,0.98)_100%)] dark:shadow-[0_22px_60px_rgba(2,6,23,0.30)] dark:hover:shadow-[0_28px_70px_rgba(2,8,20,0.38)] ${card.borderClassName}`}
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${card.accentClassName}`} />
                    <CardContent className="relative space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ${card.iconClassName}`}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          {card.badge}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-start text-2xl font-extrabold tracking-tight text-white">{card.title}</h3>
                        <p className="mt-2 text-start text-sm leading-7 text-slate-300">واجهة أكثر وضوحًا وتركيزًا لما يهم هذه الفئة داخل المنصة.</p>
                      </div>
                      <div className="space-y-3 border-t border-slate-200/70 pt-5 dark:border-white/8">
                        {card.points.map((point) => (
                          <p key={point} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-start text-sm text-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-white/[0.03] dark:shadow-none">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-sky-300">
                              <Check className="h-4 w-4" />
                            </span>
                            <span>{point}</span>
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="scroll-mt-20 rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm [&_.text-white]:text-slate-900 [&_.text-slate-200]:text-slate-700 [&_.text-slate-300]:text-slate-600 [&_.text-slate-400]:text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:[&_.text-slate-200]:text-slate-200 dark:[&_.text-slate-300]:text-slate-300 dark:[&_.text-slate-400]:text-slate-400 dark:[&_.text-white]:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-6 lg:p-8" id="pricing">
            <div className="max-w-2xl">
              <p className="text-start text-sm font-semibold text-sky-300">الأسعار</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">خطط مرنة تناسب حجم سنترك</h2>
              <p className="mt-3 text-start text-sm leading-7 text-slate-300 sm:text-base">
                اختر الخطة المناسبة الآن وابدأ بدون تعقيد.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {PLAN_LIMITS.map((plan, index) => (
                <Card
                  key={plan.name}
                  className={
                    index === 1
                      ? "border-primary bg-white ring-2 ring-primary/20 shadow-[0_20px_45px_rgba(46,134,193,0.12)] dark:bg-slate-900/90 dark:shadow-[0_26px_60px_rgba(46,134,193,0.18)]"
                      : "border-slate-200 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(2,6,23,0.28)]"
                  }
                >
                  <CardContent className="space-y-5">
                    {index === 1 ? (
                      <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-sky-300">
                        الأكثر شيوعاً
                      </span>
                    ) : null}
                    <div>
                      <h3 className="text-start text-2xl font-extrabold text-white">{plan.name}</h3>
                      <p className="mt-2 text-start text-3xl font-extrabold text-sky-300">{plan.price}</p>
                    </div>
                    <p className="text-start text-sm leading-7 text-slate-300">{plan.description}</p>
                    <div className="space-y-3">
                      {plan.features.map((feature) => (
                        <p key={feature} className="flex items-center gap-2 text-start text-sm text-slate-200">
                          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                          <span>{feature}</span>
                        </p>
                      ))}
                    </div>
                    <Link
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold !text-slate-50 transition hover:bg-secondary hover:!text-white"
                      href="/signup"
                    >
                      {index === 0 ? "ابدأ مجاناً" : "اشترك الآن"}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-5 text-start text-sm text-slate-400">لا يوجد عقود — يمكنك الإلغاء في أي وقت</p>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm [&_.text-white]:text-slate-900 [&_.text-slate-200]:text-slate-700 [&_.text-slate-400]:text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:[&_.text-slate-200]:text-slate-200 dark:[&_.text-slate-400]:text-slate-400 dark:[&_.text-white]:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-6 lg:p-8">
            <div className="max-w-2xl">
              <p className="text-start text-sm font-semibold text-sky-300">شهادات المستخدمين</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">ماذا يقول معلمونا؟</h2>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {testimonials.map((item) => (
                <Card key={item.name} className="border-slate-200 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(2,6,23,0.28)]">
                  <CardContent className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sky-300">
                      <MessageSquareQuote className="h-6 w-6" />
                    </div>
                    <p className="text-start text-lg tracking-[0.2em] text-amber-300">⭐⭐⭐⭐⭐</p>
                    <p className="text-start text-sm leading-8 text-slate-200">{item.text}</p>
                    <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                      <p className="text-start text-base font-bold text-white">{item.name}</p>
                      <p className="mt-1 text-start text-sm text-slate-400">{item.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="scroll-mt-20 rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm [&_.text-white]:text-slate-900 [&_.text-slate-300]:text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:[&_.text-slate-300]:text-slate-300 dark:[&_.text-white]:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-6 lg:p-8" id="about">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(46,134,193,0.10),_rgba(248,250,252,0.9))] p-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(46,134,193,0.16),_rgba(15,23,42,0.35))]">
                <p className="text-start text-sm font-semibold text-sky-300">من نحن</p>
                <h2 className="mt-3 text-start text-3xl font-extrabold text-white">نبني أدوات تعليمية تناسب واقع المعلم المصري</h2>
                <p className="mt-4 text-start text-sm leading-8 text-slate-300">
                  EduPlatform منصة تساعد المعلمين وأصحاب السناتر على تنظيم التشغيل اليومي من مكان واحد، بدون تعقيد وبدون خطوات كثيرة.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/80">
                  <p className="text-start text-3xl font-extrabold text-white">١٠٠٪</p>
                  <p className="mt-2 text-start text-sm leading-7 text-slate-300">واجهة عربية مصممة لتناسب إدارة السنتر من أول يوم.</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/80">
                  <p className="text-start text-3xl font-extrabold text-white">٣</p>
                  <p className="mt-2 text-start text-sm leading-7 text-slate-300">مسارات واضحة للمعلم والطالب وولي الأمر داخل نفس المنصة.</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/80">
                  <p className="text-start text-3xl font-extrabold text-white">٢٤/٧</p>
                  <p className="mt-2 text-start text-sm leading-7 text-slate-300">وصول مستمر من الموبايل والتابلت والكمبيوتر بدون تعقيد.</p>
                </div>
              </div>
            </div>
          </section>

          <MarketingFaq />

          <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,_rgba(16,50,75,0.95),_rgba(26,82,118,0.92)_45%,_rgba(46,134,193,0.88)_100%)] p-6 shadow-[0_30px_80px_rgba(26,82,118,0.22)] sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="text-start text-sm font-semibold text-white/75">ابدأ الآن</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">جاهز تنظّم سنترك؟</h2>
              <p className="mt-3 text-start text-sm leading-8 text-white/85 sm:text-base">
                انضم لآلاف المعلمين اللي وثقوا في EduPlatform
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-slate-100"
                  href="/signup"
                >
                  ابدأ مجاناً الآن
                </Link>
                <p className="text-start text-sm text-white/80">لا يلزم بطاقة ائتمان — مجاني تماماً للبداية</p>
              </div>
            </div>
          </section>

          <footer className="rounded-[32px] border border-slate-200 bg-white px-5 py-8 shadow-[0_16px_35px_rgba(15,23,42,0.08)] [&_.text-white]:text-slate-900 [&_.text-slate-400]:text-slate-600 dark:border-white/10 dark:bg-slate-950/90 dark:[&_.text-slate-400]:text-slate-400 dark:[&_.text-white]:text-white dark:shadow-[0_20px_50px_rgba(2,6,23,0.32)] sm:px-6 lg:px-8" id="footer">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-extrabold text-slate-900 dark:bg-white/10 dark:text-white">
                    E
                  </span>
                  <span className="text-base font-extrabold text-white">EduPlatform</span>
                </div>
                <p className="mt-4 text-start text-sm leading-8 text-slate-400">نظّم سنترك بذكاء</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {footerGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-start text-sm font-bold text-white">{group.title}</h3>
                    <div className="mt-4 flex flex-col gap-3">
                      {group.links.map((link) => (
                        <Link
                          key={`${group.title}-${link.label}`}
                          className="text-start text-sm text-slate-400 transition hover:text-white"
                          href={link.href}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5 dark:border-white/10">
              <p className="text-start text-sm text-slate-500">© 2026 EduPlatform — جميع الحقوق محفوظة</p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}



