'use client';

import { ArrowLeft, Phone } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOTP } from "@/modules/auth/actions";

type TenantSummary = {
  name: string;
  logoUrl: string | null;
  themeColor: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
}

export function LoginForm({ tenant }: { tenant: TenantSummary }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^01\d{9}$/.test(phone)) {
      setError("يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ ٠١");
      return;
    }

    setError("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("phone", phone);

      const result = await sendOTP(formData);

      if (!result.success) {
        setError(result.message ?? "تعذر إرسال كود التحقق");
        return;
      }

      router.push(result.redirectTo ?? `/verify?phone=${encodeURIComponent(phone)}`);
    });
  };

  return (
    <Card className="overflow-hidden rounded-[24px] border-white/30 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div
        className="relative overflow-hidden px-6 pb-7 pt-8 sm:px-8"
        style={{
          background: `linear-gradient(135deg, ${tenant.themeColor}, #2E86C1 55%, #6FB3D2)`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_32%)]" />
        <div className="relative text-center text-white">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/15 text-3xl font-extrabold shadow-lg backdrop-blur">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={tenant.name} className="h-full w-full rounded-full object-cover" src={tenant.logoUrl} />
            ) : (
              getInitials(tenant.name)
            )}
          </div>
          <h1 className="mt-5 text-3xl font-extrabold">{tenant.name}</h1>
          <p className="mt-3 text-sm leading-7 text-white/90">سجّل الدخول برقم الهاتف لاستلام كود تحقق آمن وسريع.</p>
        </div>
      </div>

      <CardContent className="p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-lg">🇪🇬</span>
              <span className="pointer-events-none absolute inset-y-0 start-14 flex items-center text-slate-400 dark:text-slate-500">
                <Phone className="h-4 w-4" />
              </span>
              <Input
                dir="ltr"
                id="phone"
                inputMode="numeric"
                maxLength={11}
                name="phone"
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                placeholder="01XXXXXXXXX"
                value={phone}
                className="ps-24 text-base font-semibold"
              />
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              يجب أن يبدأ الرقم بـ <span dir="ltr">01</span> ويتكون من <span dir="ltr">11</span> رقماً.
            </p>
          </div>

          {error ? (
            <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <Button className="w-full gap-2 text-base" disabled={isPending} type="submit">
            <span>{isPending ? "جارٍ الإرسال..." : "إرسال كود التحقق"}</span>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>

      <div className="border-t border-slate-100 px-6 py-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        منصة EduPlatform
      </div>
    </Card>
  );
}
