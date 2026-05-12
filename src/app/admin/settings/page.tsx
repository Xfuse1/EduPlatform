import { Settings } from "lucide-react";

import { toWhatsAppUrl } from "@/lib/phone";
import { requireSuperAdminPage } from "@/lib/platform-admin";
import { getPlatformConfigValue, updatePlatformConfigAction } from "@/modules/admin/actions";

export default async function AdminSettingsPage() {
  await requireSuperAdminPage();

  const adminContact = await getPlatformConfigValue("admin_contact");

  async function saveContact(formData: FormData) {
    "use server";
    const value = ((formData.get("admin_contact") as string) ?? "").trim();
    await updatePlatformConfigAction("admin_contact", value);
  }

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-sky-400" />
        <h1 className="text-2xl font-bold text-white">إعدادات المنصة</h1>
      </div>

      <div className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">معلومات التواصل</h2>
        <p className="mb-6 text-sm text-slate-400">
          رقم الواتساب الذي سيظهر لأصحاب الحسابات عند طلب الاشتراك في باقة المؤسسات أو أي مكان يتطلب التواصل مع الإدارة.
        </p>

        <form action={saveContact} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="admin_contact" className="block text-sm font-medium text-slate-300">
              رقم واتساب الإدارة
            </label>
            <input
              id="admin_contact"
              name="admin_contact"
              type="tel"
              dir="ltr"
              defaultValue={adminContact ?? ""}
              placeholder="201XXXXXXXXX"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-left text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
            <p className="text-xs text-slate-500">أدخل الرقم بصيغة دولية بدون + مثال: 201012345678</p>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 active:scale-95 sm:w-auto"
          >
            حفظ
          </button>
        </form>

        {adminContact && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            الرقم الحالي: <span dir="ltr" className="font-mono">{adminContact}</span>
            {" - "}
            <a
              href={toWhatsAppUrl(adminContact)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-emerald-200"
            >
              اختبر الرابط
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
