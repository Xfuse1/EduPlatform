"use client";

import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const faqItems = [
  {
    question: "هل أقدر أبدأ كمدرس لوحدي من غير سنتر؟",
    answer: "نعم، يمكنك إنشاء حساب معلم وإدارة مجموعاتك وطلابك وحضورك ومصاريفك من نفس المنصة بسهولة تامة.",
  },
  {
    question: "هل النظام يدعم الحضور بالـ QR؟",
    answer: "نعم، يمكنك تسجيل حضور طلابك في ثوانٍ معدودة باستخدام الـ QR، مما يوفر وقت الحصة ويمنع التلاعب.",
  },
  {
    question: "كيف أحمي بيانات طلابي من السرقة أو الضياع؟",
    answer: "بياناتك مشفرة بالكامل ويتم أخذ نسخ احتياطية منها يومياً على خوادم سحابية مؤمنة، مما يضمن أمانها التام.",
  },
  {
    question: "هل يمكنني استيراد بيانات طلابي من Excel؟",
    answer: "بالتأكيد، تدعم المنصة استيراد بيانات الطلاب بضغطة واحدة من ملفات Excel لنوفر عليك عناء الإدخال اليدوي.",
  },
  {
    question: "هل ولي الأمر يقدر يتابع ابنه؟",
    answer: "نعم، ولي الأمر لديه واجهة خاصة لمتابعة الحضور، الدرجات، والواجبات، وتصله إشعارات فورية بكل جديد.",
  },
  {
    question: "هل يوجد دعم فني إذا واجهت مشكلة؟",
    answer: "نعم، فريق الدعم الفني متاح 24/7 عبر الواتساب والاتصال المباشر لمساعدتك في أي وقت.",
  },
  {
    question: "هل أقدر أستخدم المنصة من الموبايل؟",
    answer: "نعم، المنصة مصممة لتعمل بكفاءة عالية على الموبايل والتابلت والكمبيوتر لتتابع شغلك من أي مكان.",
  },
] as const;

export function MarketingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="relative scroll-mt-20 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-2xl backdrop-blur-3xl dark:border-white/5 dark:bg-[#0F172A]/40 sm:rounded-[50px] sm:p-8 lg:p-16"
      id="faq"
    >
      <div className="flex flex-col gap-8 sm:gap-12 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <span className="rounded-full bg-sky-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-400">الأسئلة الشائعة</span>
          <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white sm:text-5xl">كل ما تود معرفته</h2>
          <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-400 sm:mt-6 sm:text-lg sm:leading-relaxed">
            جمعنا أكثر الأسئلة التي قد تخطر ببالك في مكان واحد، لتكون تجربتك مع المنصة واضحة وسلسة من اللحظة الأولى.
          </p>
        </div>

        <div className="hidden rounded-[40px] border border-slate-100 bg-slate-50 p-8 text-right backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.03] lg:block lg:w-[320px]">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">إجابة سريعة</p>
          <p className="mt-4 text-2xl font-black text-slate-900 dark:text-white">كل ما تحتاجه في دقائق</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            الأسئلة مرتبة بشكل بسيط وواضح لتصل للمعلومة مباشرة بدون تشتيت.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3 sm:mt-12 sm:space-y-4">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={item.question}
              className={cn(
                "overflow-hidden rounded-[20px] border transition-all duration-500 sm:rounded-[30px]",
                isOpen
                  ? "border-sky-500/30 bg-sky-500/5 shadow-lg shadow-sky-500/10"
                  : "border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]",
              )}
            >
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start sm:gap-4 sm:px-8 sm:py-6"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                type="button"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black transition-all",
                      isOpen
                        ? "border-sky-500/50 bg-sky-500 text-white"
                        : "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-start text-base font-bold text-slate-900 dark:text-white sm:text-lg">{item.question}</span>
                </div>

                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
                    isOpen
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-400 rotate-180"
                      : "border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500",
                  )}
                >
                  <ChevronDown className="h-5 w-5" />
                </span>
              </button>

              <div className={cn("grid transition-all duration-500 ease-in-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <div className="mx-4 mb-4 rounded-[18px] bg-slate-100 px-4 py-4 dark:bg-white/[0.03] sm:mx-8 sm:mb-8 sm:rounded-[24px] sm:px-8 sm:py-6">
                    <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{item.answer}</p>
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
