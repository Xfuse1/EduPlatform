import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/config/plans";

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(26,82,118,0.16),_transparent_25%),linear-gradient(180deg,_#f8fbff_0%,_#eef4f8_45%,_#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[36px] border bg-white shadow-soft">
          <div className="grid gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-12 lg:py-14">
            <div>
              <p className="text-sm font-semibold text-primary">منصة متخصصة للسناتر في مصر</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">نظّم سنترك في دقائق — مش في أيام</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                متابعة حضور، تحصيل مصاريف، وإشعارات للأهالي في مكان واحد مصمم خصيصًا لمدرسي السناتر ومراكز الدروس.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="touch-target inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                  href="/login"
                >
                  سجّل مجاناً
                </Link>
                <Link
                  className="touch-target inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  href="/register"
                >
                  شاهد نموذج التسجيل
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] bg-primary p-6 text-white">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-2xl">📍</p>
                  <p className="mt-3 font-bold">إدارة الحضور</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-2xl">💳</p>
                  <p className="mt-3 font-bold">تحصيل المصاريف</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-2xl">📣</p>
                  <p className="mt-3 font-bold">إشعارات الأهالي</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-extrabold text-slate-900">كيف تبدأ؟</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {["سجّل", "أضف طلابك", "ابدأ"].map((step, index) => (
              <Card key={step}>
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-primary">
                    الخطوة <span dir="ltr">{index + 1}</span>
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{step}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">كل خطوة مصممة لتكون بسيطة وسريعة وتعمل من الموبايل بدون تعقيد.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-extrabold text-slate-900">الأسعار</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {PLAN_LIMITS.map((plan) => (
              <Card key={plan.name} className="overflow-hidden">
                <div className="bg-primary/10 px-6 py-4">
                  <p className="text-lg font-bold text-slate-900">{plan.name}</p>
                  <p className="mt-2 text-2xl font-extrabold text-primary">{plan.price}</p>
                </div>
                <CardContent className="space-y-3 p-6">
                  <p className="text-sm leading-7 text-slate-600">{plan.description}</p>
                  {plan.features.map((feature) => (
                    <p key={feature} className="text-sm text-slate-700">
                      • {feature}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-10 rounded-[28px] border bg-white px-6 py-5 text-center text-sm text-slate-500 shadow-soft">
          EduPlatform © جميع الحقوق محفوظة
        </footer>
      </div>
    </main>
  );
}
