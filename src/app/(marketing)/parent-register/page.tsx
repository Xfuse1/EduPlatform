import Link from "next/link";

import { ParentRegisterLauncher } from "@/modules/public-pages/components/ParentRegisterLauncher";

export default function ParentRegisterPage() {
  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.18),_transparent_28%),linear-gradient(180deg,_#0d1830_0%,_#13203a_38%,_#0f1a30_100%)] px-4 py-6 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/8 px-5 py-4 text-white backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-white/75">EduPlatform</p>
            <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">إنشاء حساب ولي الأمر</h1>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            href="/"
          >
            العودة للرئيسية
          </Link>
        </div>

        <ParentRegisterLauncher />
      </div>
    </main>
  );
}
