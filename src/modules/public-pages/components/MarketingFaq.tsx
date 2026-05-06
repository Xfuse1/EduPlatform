"use client";

import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const faqItems = [
  {
    question: "هل أقدر أبدأ كمدرس لوحدي من غير سنتر؟",
    answer: "نعم، يمكنك إنشاء حساب معلم وإدارة مجموعاتك وطلابك وحضورك ومصاريفك من نفس المنصة.",
  },
  {
    question: "هل كل مدرس أو سنتر له رابط خاص؟",
    answer: "نعم، أثناء التسجيل تختار رابطًا خاصًا لحسابك ليصل الطلاب وأولياء الأمور إلى صفحتك بسهولة.",
  },
  {
    question: "هل ولي الأمر يقدر يتابع ابنه؟",
    answer: "نعم، ولي الأمر يستطيع متابعة الحضور، الحصص القادمة، حالة المصروفات، الواجبات، والدرجات المتاحة.",
  },
  {
    question: "هل أقدر أعرف مين دفع ومين عليه متأخرات؟",
    answer: "نعم، المنصة تعرض المدفوعات والمتأخرات والفواتير، وتساعدك تتابع التحصيل لكل طالب أو مجموعة.",
  },
  {
    question: "هل النظام يدعم الحضور بالـ QR؟",
    answer: "نعم، يمكنك إدارة جلسات الحضور وتسجيل الطلاب بسرعة، مع دعم تسجيل الحضور عبر QR في مسارات الحضور.",
  },
  {
    question: "هل أقدر أعمل واجبات أو امتحانات للطلاب؟",
    answer: "نعم، المنصة تحتوي على أقسام للواجبات والامتحانات ونتائج الطلاب، بما يناسب متابعة الأداء الدراسي.",
  },
  {
    question: "هل أقدر أستخدم المنصة من الموبايل؟",
    answer: "نعم، الواجهة تعمل من الموبايل والتابلت والكمبيوتر حتى تتابع يومك من أي جهاز.",
  },
] as const;

export function MarketingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="scroll-mt-20 overflow-hidden rounded-[36px] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(247,250,252,0.96)_100%)] p-5 shadow-[0_25px_70px_rgba(26,82,118,0.14)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-[radial-gradient(circle_at_top,rgba(46,134,193,0.08),transparent_30%),linear-gradient(180deg,rgba(14,24,42,0.96)_0%,rgba(13,22,39,0.98)_100%)] dark:shadow-[0_28px_80px_rgba(2,8,20,0.42)] sm:p-7 lg:p-9"
      id="faq"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-500 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
            <HelpCircle className="h-4 w-4" />
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">أسئلة شائعة</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300 sm:text-base">
            إجابات مباشرة على الأسئلة التي يسألها المدرس أو السنتر قبل الاعتماد على منصة لإدارة الطلاب والحضور والمصاريف.
          </p>
        </div>

        <div className="hidden rounded-[28px] border border-sky-100/80 bg-[radial-gradient(circle_at_top,rgba(46,134,193,0.18),transparent_68%),linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] p-5 text-right shadow-[0_16px_45px_rgba(46,134,193,0.12)] dark:border-slate-600/60 dark:bg-[radial-gradient(circle_at_top,rgba(46,134,193,0.16),transparent_70%),linear-gradient(180deg,rgba(18,31,52,0.95)_0%,rgba(15,26,45,0.98)_100%)] dark:shadow-[0_16px_50px_rgba(2,8,20,0.35)] lg:block lg:w-[280px]">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">قبل ما تبدأ</p>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">اعرف هل المنصة مناسبة لطريقة شغلك</p>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">
            ركزنا على الأسئلة العملية: التسجيل، الرابط الخاص، متابعة ولي الأمر، الحضور، والتحصيل.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={item.question}
              className={cn(
                "overflow-hidden rounded-[26px] border transition-all duration-300",
                isOpen
                  ? "border-slate-600/80 bg-[linear-gradient(180deg,#3f4f67_0%,#3a4960_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:border-sky-500/25 dark:bg-[linear-gradient(180deg,rgba(39,67,102,0.9)_0%,rgba(29,51,80,0.96)_100%)] dark:shadow-[0_18px_50px_rgba(7,16,32,0.35)]"
                  : "border-slate-300/70 bg-[linear-gradient(180deg,#44556e_0%,#3f5068_100%)] hover:border-slate-400/80 hover:shadow-[0_16px_38px_rgba(15,23,42,0.10)] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(28,42,65,0.96)_0%,rgba(24,36,56,0.98)_100%)] dark:hover:border-slate-600/90 dark:hover:shadow-[0_16px_40px_rgba(7,16,32,0.28)]",
              )}
            >
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-start sm:px-6"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                type="button"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition",
                      isOpen
                        ? "border-white/20 bg-white/10 text-white dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100"
                        : "border-white/10 bg-white/5 text-slate-200 dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-300",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-start text-base font-extrabold text-white sm:text-[1.15rem]">{item.question}</span>
                </div>

                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                    isOpen
                      ? "border-white/20 bg-white/10 text-white rotate-180 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100"
                      : "border-white/10 bg-white/5 text-slate-200 dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-300",
                  )}
                >
                  <ChevronDown className="h-5 w-5" />
                </span>
              </button>

              <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <div className="mx-5 mb-5 rounded-[22px] border border-white/8 bg-white/[0.06] px-5 py-4 dark:border-white/6 dark:bg-white/[0.03] sm:mx-6 sm:px-6">
                    <p className="text-sm leading-8 text-slate-100/90 dark:text-slate-200/90 sm:text-[0.97rem]">{item.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
