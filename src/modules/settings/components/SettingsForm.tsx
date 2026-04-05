'use client';

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateTenantSettings } from "@/modules/settings/actions";

type TenantSettings = {
  id: string;
  slug: string;
  name: string;
  themeColor: string;
  phone: string | null;
  region: string | null;
  bio: string | null;
  subjects: string[];
  plan: "FREE" | "BASIC" | "PRO" | "BUSINESS";
  isActive: boolean;
  smsQuota: number;
};

type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

const planLabels: Record<TenantSettings["plan"], string> = {
  FREE: "مجانية",
  BASIC: "أساسية",
  PRO: "احترافية",
  BUSINESS: "أعمال",
};

export function SettingsForm({ tenant }: { tenant: TenantSettings }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(tenant.name);
  const [themeColor, setThemeColor] = useState(tenant.themeColor || "#1A5276");
  const [phone, setPhone] = useState(tenant.phone ?? "");
  const [region, setRegion] = useState(tenant.region ?? "");
  const [bio, setBio] = useState(tenant.bio ?? "");
  const [subjects, setSubjects] = useState(tenant.subjects ?? []);
  const [subjectInput, setSubjectInput] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const bioLength = useMemo(() => bio.length, [bio]);

  const showToast = (kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const addSubject = () => {
    const nextSubject = subjectInput.trim();

    if (!nextSubject || subjects.includes(nextSubject)) {
      setSubjectInput("");
      return;
    }

    setSubjects((current) => [...current, nextSubject]);
    setSubjectInput("");
  };

  const handleSubjectKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSubject();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateTenantSettings({
        name,
        themeColor,
        phone,
        region,
        bio,
        subjects,
      });

      if (!result.success) {
        showToast("error", "❌ حدث خطأ، حاول مرة أخرى");
        return;
      }

      showToast("success", "✅ تم حفظ الإعدادات بنجاح");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={cn(
            "fixed inset-x-4 top-20 z-40 rounded-2xl border px-4 py-3 text-center text-sm font-bold shadow-lg sm:start-auto sm:end-6 sm:w-[320px]",
            toast.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الإعدادات</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">حدّث بيانات السنتر والهوية البصرية ومعلومات التواصل من نفس الصفحة.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">هوية السنتر</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">البيانات الأساسية التي تظهر للطلاب وأولياء الأمور داخل المنصة.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">اسم السنتر</Label>
                <Input id="name" onChange={(event) => setName(event.target.value)} value={name} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="slug">الرابط الخاص</Label>
                <Input className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400" id="slug" readOnly value={`${tenant.slug}.eduplatform.com`} />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">لا يمكن تغيير الرابط بعد الإنشاء</p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="themeColor">اللون الرئيسي</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <input
                    className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-transparent p-1 dark:border-slate-700"
                    id="themeColor"
                    onChange={(event) => setThemeColor(event.target.value)}
                    type="color"
                    value={themeColor}
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{themeColor}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">معلومات التواصل</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">هذه البيانات تساعد في عرض معلومات السنتر والتواصل السريع.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  dir="ltr"
                  id="phone"
                  inputMode="numeric"
                  maxLength={11}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  value={phone}
                />
              </div>

              <div>
                <Label htmlFor="region">المحافظة</Label>
                <Input
                  id="region"
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="مثال: القاهرة، سوهاج"
                  value={region}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">نبذة عن السنتر</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">قدم وصفًا مختصرًا وواضحًا عن خدمات السنتر والمواد التي يقدّمها.</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label className="mb-0" htmlFor="bio">نبذة تعريفية</Label>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{bioLength}/300</span>
              </div>
              <textarea
                className="touch-target min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                id="bio"
                maxLength={300}
                onChange={(event) => setBio(event.target.value)}
                placeholder="اكتب نبذة قصيرة عن سنترك..."
                value={bio}
              />
            </div>

            <div>
              <Label htmlFor="subjects">المواد الدراسية</Label>
              <Input
                id="subjects"
                onChange={(event) => setSubjectInput(event.target.value)}
                onKeyDown={handleSubjectKeyDown}
                placeholder="اكتب مادة واضغط Enter"
                value={subjectInput}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm font-bold text-primary dark:bg-sky-400/10 dark:text-sky-300"
                  >
                    <span>{subject}</span>
                    <button
                      aria-label={`حذف ${subject}`}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-primary dark:bg-slate-900/70 dark:text-sky-300"
                      onClick={() => setSubjects((current) => current.filter((item) => item !== subject))}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">معلومات الخطة</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">هذه البيانات للعرض فقط ولا يمكن تعديلها من هذه الصفحة.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">الخطة الحالية</p>
                <p className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">{planLabels[tenant.plan]}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">حالة الحساب</p>
                <p className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">{tenant.isActive ? "نشط ✅" : "غير نشط ❌"}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">رصيد الرسائل</p>
                <p className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">{tenant.smsQuota} رسالة متبقية</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              <span>جاري الحفظ...</span>
            </span>
          ) : (
            "حفظ التغييرات"
          )}
        </Button>
      </form>
    </div>
  );
}
