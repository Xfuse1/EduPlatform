'use client';

import { Save, UserPlus, Phone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAssistantAction } from "../actions";

interface AddAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (assistant: any) => void;
}

export function AddAssistantModal({ isOpen, onClose, onAdd }: AddAssistantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.phone.length < 10) {
        setError("رقم الهاتف غير صحيح");
        setLoading(false);
        return;
      }

      const res = await addAssistantAction(formData);

      if (res.success && res.user) {
        onAdd(res.user);
        onClose();
        setFormData({ name: "", phone: "" });
      } else {
        setError(res.error || "حدث خطأ غير متوقع");
      }
    } catch (err: any) {
      setError("حدث مشكلة في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900 border-b pb-4 dark:text-white">إضافة مساعد جديد</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100 flex items-center justify-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-200">الاسم الثلاثي المساعد</Label>
            <div className="relative">
              <UserPlus className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="name"
                placeholder="أحمد محمد مصطفى"
                required
                className="pr-10 min-h-11 text-sm bg-slate-50 dark:bg-slate-900"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-200">رقم الهاتف (للسكرتارية وتسجيل الدخول)</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder="010..."
                required
                className="pr-10 min-h-11 text-sm text-left bg-slate-50 dark:bg-slate-900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+]/g, '') })}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">سجل هذا الرقم ليستطيع الدخول للمنصة كـ مساعد.</p>
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="button" variant="outline" className="flex-1 min-h-11 border-slate-200" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="flex-1 min-h-11 shadow-primary/20 bg-primary hover:bg-primary/90 font-bold" disabled={loading}>
              {loading ? "جاري الحفظ..." : (
                  <>
                    <Save className="me-2 h-4 w-4" />
                    تأكيد وإضافة
                  </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
