export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Phone } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function toWhatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export default async function AccountRestrictedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  const [tenant, adminContact] = await Promise.all([
    db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, isActive: true },
    }),
    db.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
      select: { name: true, phone: true },
    }),
  ]);

  if (tenant?.isActive) {
    redirect("/");
  }

  const adminPhone = adminContact?.phone ?? null;

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_transparent_32%),linear-gradient(145deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-4 py-10"
      dir="rtl"
    >
      <section className="w-full max-w-lg rounded-2xl border border-rose-300/20 bg-slate-950/70 p-6 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-500/10 text-rose-200">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-white">تم تقييد حسابك</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          مؤسسة {tenant?.name ?? "هذا الحساب"} موقوفة حالياً. راجع الإدارة لإعادة التفعيل أو معرفة سبب التقييد.
        </p>

        {adminPhone ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-400"
              href={toWhatsappUrl(adminPhone)}
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
            لم يتم العثور على رقم إدارة متاح حالياً.
          </p>
        )}

        <Link className="mt-6 inline-flex text-sm font-bold text-slate-300 hover:text-white" href="/api/auth/logout">
          تسجيل الخروج
        </Link>
      </section>
    </main>
  );
}
