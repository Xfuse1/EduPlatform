"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Sparkles
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PLAN_LIMITS } from "@/config/plans";
import { MarketingFaq } from "@/modules/public-pages/components/MarketingFaq";

const features = [
  {
    title: "إدارة الحضور",
    description: "متابعة الحصص والغياب والتأخير من شاشة واضحة وسريعة.",
    image: "/images/attendance.png",
  },
  {
    title: "تحصيل المصاريف",
    description: "عرض واضح للمدفوع والمتأخر مع مؤشرات بصرية فورية.",
    image: "/images/fees.png",
  },
  {
    title: "إشعارات للأهالي",
    description: "تجربة تواصل منظمة مع أولياء الأمور والطلاب.",
    image: "/images/notifications.png",
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
    title: "تنظيم المجموعات",
    description: "أنشئ مجموعاتك وحدد مواعيدها وأسعارها في دقائق",
    illustration: "/images/Group Management.png",
    badge: "تخطيط ذكي",
    points: [
      "إدارة عدد غير محدود من الطلاب",
      "ترتيب المواعيد والجداول بسهولة",
      "توزيع الطلاب على مستويات",
      "قاعدة بيانات منظمة وآمنة",
    ],
  },
  {
    title: "إدارة دروسك بذكاء",
    description: "تفرّغ للإبداع في الشرح واترك لنا عناء تنظيم الحضور والتحصيل المالي.",
    illustration: "/images/Smart Management Start.png",
    badge: "سرعة التنفيذ",
    points: [
      "تسجيل حضور طلابك في ثوانٍ",
      "تحصيل المصاريف آلياً وبدون إحراج",
      "تنبيهات فورية لطلابك المتأخرين",
      "كل بيانات طلابك في جيبك",
    ],
  },
  {
    title: "التقارير والمتابعة",
    description: "تابع أداء كل طالب وأرسل تقارير للأهالي بنقرة واحدة",
    illustration: "/images/Reports and Follow-up.png",
    badge: "رؤية شاملة",
    points: [
      "تقارير مالية شهرية وأسبوعية",
      "إحصائيات حضور وغياب دقيقة",
      "متابعة تطور مستوى الطلاب",
      "إرسال تقارير للأهالي بنقرة",
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

const aboutStats = [
  { 
    label: "واجهة عربية بالكامل", 
    value: "١٠٠٪", 
    desc: "مصممة خصيصاً لتناسب احتياجاتك كمعلم من أول يوم بدون أي تعقيد لغوي.",
    image: "/images/arabic-ui.png" 
  },
  { 
    label: "دعم مستمر ٢٤/٧", 
    value: "دائماً", 
    desc: "فريقنا معك في كل خطوة، نضمن لك استمرارية عملك وسرعة الاستجابة لاستفساراتك.",
    image: "/images/support-247.png"
  },
  { 
    label: "مسارات متكاملة", 
    value: "٣", 
    desc: "تجربة موحدة تربط المعلم، الطالب، وولي الأمر في منظومة تعليمية واحدة متناغمة.",
    image: "/images/three-paths.png"
  }
] as const;

export default function MarketingPage() {
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    const headerOffset = 96;
    const targetTop = section.getBoundingClientRect().top + window.scrollY - headerOffset;
    const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;

    window.scrollTo({
      top: Math.min(Math.max(targetTop, 0), maxScrollTop),
      behavior: "smooth",
    });

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };
  const scrollToHash = (hash: string) => scrollToSection(hash.replace("#", ""));

  return (
    <main
      className="min-h-screen scroll-smooth bg-white font-[Cairo] text-slate-900 dark:bg-[#0F172A] dark:text-white"
      dir="rtl"
      id="home"
    >
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: rotateX(8deg) rotateY(-6deg) translateY(0px);
          }
          50% {
            transform: rotateX(12deg) rotateY(8deg) translateY(-18px);
          }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 10s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
      `}</style>
      <div className="relative overflow-hidden bg-white dark:bg-[#050814]">
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
              {/* Main Liquid Streams */}
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
              
              {/* Secondary Accents */}
              <path 
                d="M500,-100 C600,400 200,600 500,1100" 
                fill="none" 
                stroke="url(#luxe-gradient-1)" 
                strokeWidth="40" 
                filter="url(#luxe-blur-2)" 
                className="opacity-50"
              />
              <path 
                d="M1100,200 C800,400 600,100 200,800" 
                fill="none" 
                stroke="url(#luxe-gradient-2)" 
                strokeWidth="60" 
                filter="url(#luxe-blur-1)" 
                className="opacity-40"
              />
            </g>
          </svg>
        </div>

        {/* Texture Overlay for that premium feel */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />

        {/* Floating blurred blobs for additional depth */}
        <div className="absolute left-[5%] top-[15%] h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[0%] h-[600px] w-[600px] rounded-full bg-indigo-900/10 blur-[180px]" />

        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-white/[0.03] dark:bg-slate-950/40">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden items-center gap-3 sm:flex">
                <Link
                  className="group relative flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-sky-500/50 hover:bg-sky-500/5 dark:border-sky-500/30 dark:bg-sky-500/5 dark:text-sky-400 dark:hover:bg-sky-500/10"
                  href="/login"
                >
                  <span className="relative z-10">تسجيل الدخول</span>
                  <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-sky-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                </Link>
                <Link
                  className="relative flex items-center justify-center overflow-hidden rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-600 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95"
                  href="/signup"
                >
                  ابدأ مجاناً
                </Link>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden items-center gap-10 lg:flex">
              {navigationLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => scrollToHash(link.href)}
                  className="relative text-sm font-semibold text-slate-600 transition-colors hover:text-sky-600 group dark:text-slate-400 dark:hover:text-white"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-sky-400 transition-all group-hover:w-full" />
                </button>
              ))}
            </nav>

            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  EduPlatform
                </span>
                <div className="h-0.5 w-1/2 rounded-full bg-gradient-to-l from-sky-400 to-transparent" />
              </div>
              <div className="group relative flex h-11 w-11 items-center justify-center">
                <div className="absolute inset-0 animate-pulse rounded-full bg-sky-500/20 blur-[8px]" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-900 shadow-2xl transition-transform group-hover:scale-110">
                  <div className="h-4 w-4 rounded-full bg-gradient-to-br from-sky-300 via-blue-500 to-emerald-400" />
                  <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-transparent border-t-sky-400/30" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 space-y-20 lg:space-y-32">
          <section className="relative overflow-hidden rounded-[60px] border border-slate-200 bg-white shadow-2xl backdrop-blur-3xl dark:border-white/[0.05] dark:bg-[#0F172A]/40 sm:px-12 sm:py-16 lg:px-20 lg:py-24">
            {/* Refined Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]">
              <div className="h-full w-full bg-[size:32px_32px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]" />
            </div>

            <div className="relative grid gap-20 lg:grid-cols-[1fr_1fr]">
              {/* Right Side (Visual Right in RTL): Hero Content */}
              <div className="flex flex-col justify-center">
                <div className="group inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-sky-400 backdrop-blur-md transition-all hover:bg-white/10">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[10px]">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  منصة متخصصة للمعلمين المستقلين في مصر
                </div>

                <h1 className="mt-10 text-5xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
                  حوّل إدارة دروسك <br />
                  إلى تجربة <span className="relative">
                    <span className="relative z-10 bg-gradient-to-l from-sky-300 via-emerald-300 to-sky-300 bg-clip-text text-transparent">أنيقة</span>
                    <span className="absolute -bottom-2 left-0 h-3 w-full bg-emerald-500/20 blur-sm" />
                  </span> وسريعة.
                </h1>

                <p className="mt-10 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                  منصة التعليم المتكاملة لتحصيل المصاريف، تنظيم الجداول، وإدارة شؤون الطلاب بضغطة واحدة من أي مكان.
                </p>

                <div className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-center">
                  <Link
                    className="relative flex h-16 items-center justify-center gap-3 overflow-hidden rounded-[20px] bg-emerald-500 px-10 text-lg font-black text-white shadow-[0_20px_40px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-600 hover:shadow-[0_25px_50px_rgba(16,185,129,0.35)] hover:-translate-y-1 active:translate-y-0"
                    href="/signup"
                  >
                    ابدأ مجاناً — سجّل الآن
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToSection("how-it-works")}
                    className="group relative flex h-16 items-center justify-center gap-3 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 px-10 text-lg font-bold text-slate-900 backdrop-blur-md transition-all hover:bg-slate-100 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20"
                  >
                    <span>شاهد كيف يعمل</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-transform group-hover:scale-110">
                      <div className="h-2 w-2 rounded-full bg-sky-400" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Left Side (Visual Left in RTL): Dashboard Mockup & Statistics */}
              <div className="flex flex-col justify-center">
                {/* Horizontal Statistics with Dividers */}
                <div className="mb-12 flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-8 backdrop-blur-md dark:border-white/[0.03] dark:bg-white/[0.02]">
                  {heroStats.map((stat, i) => (
                    <React.Fragment key={stat.label}>
                      <div className="flex-1 text-center">
                        <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
                      </div>
                      {i < heroStats.length - 1 && <div className="h-10 w-px bg-slate-200 dark:bg-white/5" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Highly Detailed Dashboard Mockup */}
                <div 
                  className="group relative rounded-[40px] border border-slate-200 bg-white p-6 shadow-2xl backdrop-blur-2xl transition-all duration-700 hover:border-sky-500/20 dark:border-white/10 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                  style={{ 
                    animation: "float 3.5s ease-in-out infinite",
                    transformStyle: "preserve-3d"
                  }}
                >
                  <div className="absolute -inset-0.5 rounded-[40px] bg-gradient-to-br from-sky-500/20 to-emerald-500/20 opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100" />

                  <div className="relative">
                    {/* Mockup Header */}
                    <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500/30" />
                        <div className="h-3 w-3 rounded-full bg-amber-500/30" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500/30" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-16 rounded-full bg-slate-100 dark:bg-white/5" />
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/10" />
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                      {/* Sidebar Mockup */}
                      <div className="col-span-3 space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-white/5" />
                            <div className={`h-2 rounded-full bg-slate-100 dark:bg-white/5 ${i === 0 ? "w-full" : "w-2/3"}`} />
                          </div>
                        ))}
                      </div>

                      {/* Main Chart Area */}
                      <div className="col-span-9">
                        <div className="relative h-48 w-full overflow-hidden rounded-3xl bg-slate-50 p-5 dark:bg-white/[0.03]">
                          <div className="flex h-full items-end gap-1.5">
                            {[30, 60, 40, 80, 55, 90, 45, 100, 70, 85, 60, 75].map((h, i) => (
                              <div
                                key={i}
                                className="flex-1 rounded-t-lg bg-gradient-to-t from-sky-500/10 via-sky-400/40 to-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.1)] transition-all duration-500 group-hover:via-sky-400/60 group-hover:to-sky-400"
                                style={{ height: `${h}%`, transitionDelay: `${i * 30}ms` }}
                              />
                            ))}
                          </div>
                          {/* Interactive Wave SVG */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <svg className="w-full" height="80" viewBox="0 0 400 80">
                              <path
                                d="M0 40 C 50 10, 100 70, 150 40 S 250 10, 300 40 S 400 70, 400 40"
                                fill="none"
                                stroke="url(#mockup-gradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                className="animate-pulse"
                              />
                              <defs>
                                <linearGradient id="mockup-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                  <stop offset="0%" stopColor="#38bdf8" />
                                  <stop offset="50%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="#fbbf24" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 scroll-mt-20 rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl backdrop-blur-sm sm:p-10 lg:p-12 dark:border-white/10 dark:bg-white/[0.03]" id="features">

            <div className="max-w-2xl">
              <p className="text-start text-sm font-semibold text-sky-300">المميزات</p>
              <h2 className="mt-3 text-start text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">كل ما تحتاجه في مكان واحد</h2>
              <p className="mt-3 text-start text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                منصة متكاملة تحل كل مشاكل تنظيم عملك التعليمي
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="group relative flex flex-col items-center rounded-[40px] border border-slate-100 bg-slate-50 p-6 text-center backdrop-blur-xl transition-all hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                  <div className="relative mb-4 flex h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="h-[200px] w-[200px] object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-lg leading-relaxed text-slate-600 dark:text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="scroll-mt-20 overflow-hidden rounded-[50px] border border-slate-200 bg-white p-8 shadow-2xl backdrop-blur-3xl lg:p-16 dark:border-white/5 dark:bg-[#0F172A]/40" id="how-it-works">
            <div className="max-w-2xl">
              <span className="rounded-full bg-sky-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-400">كيف يعمل</span>
              <h2 className="mt-6 text-4xl font-black text-slate-900 sm:text-5xl dark:text-white">ابدأ في 3 خطوات بسيطة</h2>
            </div>

            <div className="relative mt-12 grid gap-8 md:grid-cols-3">
              <div className="absolute inset-x-32 top-20 hidden h-[1px] md:block">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-sky-400/20 blur-[4px] dark:bg-sky-500/30" />

                {/* Solid Connected Line */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-sky-400/50 to-transparent dark:via-sky-500" />

                {/* Animated Shine/Motion Effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/30 to-transparent animate-pulse dark:via-sky-300/20" />
                </div>

                {/* Highly Visible Directional Arrows */}
                <div className="absolute inset-0 flex items-center justify-around px-24">
                  {[...Array(3)].map((_, i) => (
                    <ArrowLeft
                      key={i}
                      className="h-5 w-5 text-sky-400/60 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] animate-pulse dark:text-sky-500/60 dark:drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                      style={{ animationDelay: `${i * 400}ms` }}
                    />
                  ))}
                </div>
              </div>
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="group relative rounded-[40px] border border-white/5 bg-white/[0.02] p-10 backdrop-blur-xl transition-all hover:bg-white/[0.04]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-500/10 text-4xl font-black text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.1)] transition-transform group-hover:scale-110">
                      {step.number}
                    </div>
                    <h3 className="mt-8 text-2xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
                    <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex w-full justify-center py-4 md:hidden">
                      <div 
                        className="w-[2px] h-[50px] rounded-full bg-gradient-to-b from-sky-400/40 to-indigo-400/40 shadow-[0_0_10px_rgba(56,189,248,0.15)] dark:from-[#00B8A0] dark:to-[#1A2B6D] dark:shadow-[0_0_12px_3px_rgba(0,184,160,0.3)]"
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-12 flex justify-center lg:justify-start">
              <Link
                className="relative flex h-16 items-center justify-center gap-3 overflow-hidden rounded-[20px] bg-sky-500 px-10 text-lg font-black text-white shadow-xl transition-all hover:bg-sky-600 hover:-translate-y-1 active:translate-y-0"
                href="/signup"
              >
                ابدأ الآن مجاناً
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
          </section>

          <section className="scroll-mt-20 overflow-hidden rounded-[50px] border border-slate-200 bg-white p-8 shadow-2xl backdrop-blur-3xl lg:p-16 dark:border-white/5 dark:bg-[#0F172A]/40" id="smart-tools">
            <div className="max-w-2xl">
              <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">أدوات ذكية للمعلم</span>
              <h2 className="mt-6 text-4xl font-black text-slate-900 sm:text-5xl dark:text-white">منصة مصممة لخدمة المعلم</h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400">كل ما تحتاجه لإدارة مجموعاتك بتركيز فائق وهدوء تام.</p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {audienceCards.map((card) => (
                <div
                  key={card.title}
                  className="group relative flex flex-col items-center overflow-hidden rounded-[40px] border border-slate-200 bg-white p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:border-white/5 dark:bg-[#0F172A]/40 dark:hover:bg-[#0F172A]/60"
                >
                  {/* Badge */}
                  <div className="absolute left-6 top-6">
                    <span className="rounded-full bg-sky-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-400 backdrop-blur-md">
                      {card.badge}
                    </span>
                  </div>

                  {/* Image with Background Glow */}
                  <div className="relative mb-6 mt-4 flex h-[180px] w-full items-center justify-center">
                    <div className="absolute h-32 w-32 rounded-full bg-sky-500/20 blur-[50px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <img
                      src={card.illustration}
                      alt={card.title}
                      className="relative z-10 h-48 w-48 object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mx-auto max-w-[240px] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {card.description}
                    </p>
                  </div>

                  {/* Points List */}
                  <div className="mt-8 w-full space-y-3 border-t border-slate-100 pt-8 dark:border-white/5">
                    {card.points.map((point) => (
                      <div key={point} className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                          <Check className="h-3 w-3" />
                        </div>
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Simplified Pricing Section */}
          <section className="scroll-mt-20" id="pricing">
            <div className="mb-12 text-center">
              <span className="rounded-full bg-sky-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-400">الأسعار</span>
              <h2 className="mt-6 text-4xl font-black text-slate-900 sm:text-5xl dark:text-white">خطط مرنة تناسب عدد طلابك</h2>
              <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">اختر الخطة المناسبة وابدأ في تنظيم عملك اليوم</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {PLAN_LIMITS.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-[40px] border p-10 transition-all duration-500 hover:-translate-y-2 ${index === 1
                    ? "border-sky-500 bg-sky-50 shadow-[0_20px_50px_rgba(14,165,233,0.1)] dark:border-sky-500/50 dark:bg-sky-500/5 dark:shadow-[0_20px_50px_rgba(14,165,233,0.15)]"
                    : "border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                    }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950">
                      الأكثر اختياراً
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900 dark:text-white">{plan.price}</span>
                      <span className="text-sm text-slate-400 dark:text-slate-500">/شهرياً</span>
                    </div>
                  </div>
                  <div className="mb-10 flex-1 space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <Check className="h-3 w-3" />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Link
                    className={`flex h-14 items-center justify-center rounded-2xl text-sm font-black transition-all ${index === 1
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600"
                      : "bg-white/5 text-white hover:bg-white/10"
                      }`}
                    href="/signup"
                  >
                    {index === 0 ? "ابدأ مجاناً" : "اشترك الآن"}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Simplified Testimonials */}
          <section className="scroll-mt-20">
            <div className="mb-12 text-center">
              <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">قالوا عنا</span>
              <h2 className="mt-6 text-4xl font-black text-slate-900 sm:text-5xl dark:text-white">ماذا يقول معلمونا؟</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {testimonials.map((item, i) => (
                <div key={item.name} className="group relative rounded-[40px] border border-slate-100 bg-slate-50 p-8 transition-all hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                  <div className="mb-6 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 w-4 text-amber-400">★</div>
                    ))}
                  </div>
                  <p className="mb-8 text-lg leading-relaxed text-slate-600 italic dark:text-slate-300">"{item.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-lg font-bold text-white">
                      {item.name[2]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                      <p className="text-xs text-slate-500">{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Simplified About & Impact */}
          <section className="scroll-mt-20" id="about">
            <div className="overflow-hidden rounded-[60px] border border-slate-200 bg-white p-10 lg:p-20 dark:border-white/5 dark:bg-[#0F172A]/40 backdrop-blur-3xl">
              <div className="grid gap-20 lg:grid-cols-[1.2fr_1fr]">
                {/* Content Side */}
                <div className="flex flex-col justify-center order-2 lg:order-1">
                  <div className="group inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-indigo-400 backdrop-blur-md transition-all hover:bg-white/10">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px]">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    من نحن
                  </div>
                  
                  <h2 className="mt-10 text-4xl font-black leading-tight text-slate-900 sm:text-6xl dark:text-white">
                    نبني أدوات تعليمية <br />
                    <span className="bg-gradient-to-l from-indigo-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">تناسب واقع المعلم المصري</span>
                  </h2>
                  
                  <p className="mt-10 text-xl leading-relaxed text-slate-600 dark:text-slate-400 max-w-xl">
                    وداعاً للدفاتر الورقية وإرهاق تتبع المصاريف. EduPlatform منصة صُممت خصيصاً لتناسب تفاصيل يومك المعقدة كمعلم مصري، لنوفّر وقتك لتركّز على ما تبدع فيه: التدريس.
                  </p>
                  
                  <div className="mt-12 p-8 rounded-[30px] border border-dashed border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                      <Sparkles className="h-12 w-12 text-indigo-400" />
                    </div>
                    <p className="relative z-10 text-lg italic text-indigo-400/90 leading-relaxed font-medium">
                      "هدفنا ليس مجرد أتمتة العمليات، بل تمكين المعلم المصري بأدوات تكنولوجية تليق بمكانته وتسهل عليه رحلة العطاء المستمرة."
                    </p>
                  </div>
                </div>

                {/* Stats/Cards Side (Dynamic Layout) */}
                <div className="relative order-1 lg:order-2 flex flex-col justify-center">
                  {/* Decorative Glow */}
                  <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
                  
                  <div className="grid gap-8">
                    {aboutStats.map((stat, i) => (
                      <div 
                        key={stat.label} 
                        className={`group relative flex items-center gap-6 rounded-[40px] border border-slate-100 bg-slate-50 p-8 transition-all duration-500 hover:-translate-x-3 hover:shadow-2xl dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] ${i === 1 ? 'lg:mr-16' : ''}`}
                      >
                        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-inner dark:bg-slate-900/50">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <img 
                            src={stat.image} 
                            alt={stat.label} 
                            className="relative z-10 h-32 w-32 object-contain transition-transform duration-500 group-hover:scale-110" 
                          />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-indigo-400">{stat.value}</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">{stat.label}</h4>
                          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                            {stat.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <MarketingFaq />

          {/* Premium Footer CTA */}
          <section className="relative overflow-hidden rounded-[50px] bg-gradient-to-br from-sky-600 to-indigo-700 p-12 text-center sm:p-20">
            <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent)] bg-[size:20px_20px] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)]" />
            <div className="relative z-10 mx-auto max-w-3xl">
              <h2 className="text-4xl font-black text-white sm:text-6xl">جاهز تنظّم دروسك؟</h2>
              <p className="mt-6 text-lg text-sky-100 opacity-80">انضم لآلاف المعلمين الذين وثقوا في EduPlatform وارتقِ بمستوى إدارتك اليوم.</p>
              <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <Link
                  className="flex h-16 items-center justify-center rounded-2xl bg-white px-10 text-lg font-black text-sky-600 shadow-2xl transition-all hover:bg-sky-50 hover:scale-105 active:scale-95"
                  href="/signup"
                >
                  ابدأ مجاناً الآن
                </Link>
                <div className="flex items-center gap-2 text-sm text-sky-100/60">
                  <Check className="h-4 w-4" />
                  بدون بطاقة ائتمان — مجاني للبداية
                </div>
              </div>
            </div>
          </section>

          {/* Clean Modern Footer */}
          <footer className="mt-10 rounded-[40px] border border-slate-200 bg-white p-12 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/50" id="footer">
            <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 font-black text-white">E</div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">EduPlatform</span>
                </div>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-500">
                  نحن نؤمن بأن التكنولوجيا يجب أن تخدم التعليم، لا أن تعقده. هدفنا هو جعل عملك كمعلم أسهل وأكثر كفاءة.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                {footerGroups.map((group) => (
                  <div key={group.title}>
                    <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{group.title}</h4>
                    <ul className="space-y-4">
                      {group.links.map((link) => (
                        <li key={link.label}>
                          <button
                            type="button"
                            className="text-sm text-slate-500 transition-colors hover:text-white"
                            onClick={() => scrollToHash(link.href)}
                          >
                            {link.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-16 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
              © 2026 EduPlatform — جميع الحقوق محفوظة. صُمم بكل حب لدعم المعلم المصري.
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
