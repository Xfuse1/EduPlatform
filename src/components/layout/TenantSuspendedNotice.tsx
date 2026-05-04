import { AlertTriangle, Phone, ShieldAlert } from "lucide-react";

import { toWhatsAppUrl } from "@/lib/phone";

export function TenantSuspendedNotice({
  tenantName,
  adminPhone,
}: {
  tenantName: string;
  adminPhone?: string | null;
}) {
  return (
    <section dir="rtl" className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-rose-300/20 bg-slate-950/70 p-6 text-center shadow-2xl backdrop-blur dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-500/10 text-rose-200">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-100">
          <AlertTriangle className="h-4 w-4" />
          المؤسسة موقوفة مؤقتا
        </div>

        <h1 className="mt-4 text-2xl font-extrabold text-white">تم إيقاف الوصول إلى بيانات المؤسسة</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
          مؤسسة {tenantName} موقوفة حاليا، لذلك تم تعطيل عرض البيانات والعمليات داخل المنصة. تواصل مع إدارة
          المنصة لمعرفة سبب الإيقاف أو إعادة التفعيل.
        </p>

        {adminPhone ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-400"
              href={toWhatsAppUrl(adminPhone)}
              rel="noreferrer"
              target="_blank"
            >
              <Phone className="h-4 w-4" />
              تواصل مع الإدارة
            </a>
            <a
              className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-bold text-slate-100 transition hover:border-sky-300/40"
              href={`tel:${adminPhone}`}
            >
              {adminPhone}
            </a>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            لا يوجد رقم إدارة متاح حاليا. برجاء التواصل مع مسؤول المنصة مباشرة.
          </p>
        )}
      </div>
    </section>
  );
}
