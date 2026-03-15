'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendOTP } from "@/modules/auth/actions";

type TenantSummary = {
  name: string;
  logoUrl: string | null;
  themeColor: string;
};

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
    <Card className="overflow-hidden border-slate-200">
      <div className="px-6 pb-6 pt-8 sm:px-8" style={{ backgroundColor: `${tenant.themeColor}14` }}>
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: tenant.themeColor }}
        >
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={tenant.name} className="h-full w-full rounded-full object-cover" src={tenant.logoUrl} />
          ) : (
            tenant.name.slice(0, 1)
          )}
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-slate-900">{tenant.name}</h1>
        <p className="mt-2 text-center text-sm text-slate-600">سجّل الدخول برقم الهاتف لاستلام كود التحقق</p>
      </div>

      <CardContent className="p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              dir="ltr"
              id="phone"
              inputMode="numeric"
              maxLength={11}
              name="phone"
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
              placeholder="01XXXXXXXXX"
              value={phone}
            />
            <p className="mt-2 text-xs text-slate-500">يجب أن يبدأ الرقم بـ <span dir="ltr">01</span> ويتكون من <span dir="ltr">11</span> رقمًا</p>
          </div>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? "جارٍ الإرسال..." : "إرسال كود التحقق"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
