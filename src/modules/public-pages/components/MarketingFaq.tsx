"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const faqItems = [
  {
    question: "هل يشتغل الموقع من الموبايل؟",
    answer: "نعم، المنصة مصممة للموبايل أولاً وتشتغل بسلاسة على كل الأجهزة.",
  },
  {
    question: "هل بياناتي آمنة؟",
    answer: "نعم، كل بياناتك محمية ومعزولة تماماً عن باقي المستخدمين.",
  },
  {
    question: "هل يمكنني إلغاء الاشتراك؟",
    answer: "نعم، يمكنك الإلغاء في أي وقت بدون أي رسوم إضافية.",
  },
  {
    question: "كيف أبدأ؟",
    answer: "فقط اضغط على ابدأ مجاناً وأنشئ حسابك في أقل من دقيقة.",
  },
] as const;

export function MarketingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="scroll-mt-20 rounded-[32px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-sm sm:p-6 lg:p-8"
      id="faq"
    >
      <div className="max-w-2xl">
        <p className="text-start text-sm font-semibold text-sky-300">الأسئلة الشائعة</p>
        <h2 className="mt-3 text-start text-3xl font-extrabold text-white sm:text-4xl">أسئلة شائعة</h2>
      </div>

      <div className="mt-6 space-y-3">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={item.question} className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/80">
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                type="button"
              >
                <span className="text-start text-sm font-bold text-white sm:text-base">{item.question}</span>
                <ChevronDown
                  className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
                />
              </button>
              <div className={cn("grid transition-all duration-200", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-start text-sm leading-7 text-slate-300">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
