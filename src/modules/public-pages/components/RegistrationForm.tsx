'use client';

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupSelector } from "@/modules/public-pages/components/GroupSelector";
import { registerStudent } from "@/modules/public-pages/actions";

type GroupSummary = {
  id: string;
  name: string;
  days: string[];
  timeStart: string;
  timeEnd: string;
  monthlyFee: number;
  remainingCapacity: number;
  enrolledCount: number;
  maxCapacity: number;
  isFull: boolean;
};

export function RegistrationForm({ groups }: { groups: GroupSummary[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups.find((group) => !group.isFull)?.id ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("groupId", selectedGroupId);

    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await registerStudent(formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      form.reset();
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5">
        <CardTitle>استمارة التسجيل</CardTitle>
        <p className="mt-2 text-sm text-slate-600">املأ البيانات التالية وسنقوم بمراجعة التسجيل والتواصل معكم.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="studentName">اسم الطالب</Label>
              <Input id="studentName" name="studentName" placeholder="اكتب اسم الطالب" />
            </div>
            <div>
              <Label htmlFor="grade">الصف الدراسي</Label>
              <Input id="grade" name="grade" placeholder="مثال: الصف الثالث الثانوي" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="parentName">اسم ولي الأمر</Label>
              <Input id="parentName" name="parentName" placeholder="اكتب اسم ولي الأمر" />
            </div>
            <div>
              <Label htmlFor="parentPhone">رقم ولي الأمر</Label>
              <Input dir="ltr" id="parentPhone" inputMode="numeric" name="parentPhone" placeholder="01XXXXXXXXX" />
            </div>
          </div>

          <div>
            <Label>اختر المجموعة</Label>
            <input name="groupId" type="hidden" value={selectedGroupId} />
            <GroupSelector groups={groups} onChange={setSelectedGroupId} selectedGroupId={selectedGroupId} />
          </div>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

          <Button className="w-full" disabled={isPending || !selectedGroupId} type="submit">
            {isPending ? "جارٍ إرسال التسجيل..." : "تأكيد التسجيل"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
