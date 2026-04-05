'use client';

import { ShieldCheck, UserPlus, Phone, Search, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddAssistantModal } from "./AddAssistantModal";

interface Assistant {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}

interface AssistantsPageClientProps {
  assistants: Assistant[];
}

export function AssistantsPageClient({ assistants: initialAssistants }: AssistantsPageClientProps) {
  const [assistants, setAssistants] = useState<Assistant[]>(initialAssistants);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = assistants.filter((a) => {
    return a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.phone.includes(searchQuery);
  });

  const handleAdd = (newAssistant: any) => {
      setAssistants([newAssistant, ...assistants]);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">إدارة المساعدين (السكرتارية)</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">أضف مساعدين لمساعدتك في تسجيل الحضور وتحصيل المصاريف.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="min-h-12 px-6">
          <UserPlus className="me-2 h-5 w-5" />
          إضافة مساعد جديد
        </Button>
      </div>

      <div className="max-w-md space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">ابحث باسم المساعد أو رقمه</label>
          <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="رقم الهاتف أو الاسم..." 
                className="ps-10 min-h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 md:pt-4">
        {filtered.map((assistant) => (
          <Card key={assistant.id} className="group overflow-hidden rounded-[24px]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-xl font-bold text-slate-900 dark:text-white">{assistant.name}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium" dir="ltr">{assistant.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                 <Button variant="outline" className="w-full text-xs h-9">
                    تعديل الصلاحيات
                 </Button>
                 <Button variant="outline" className="w-full text-xs h-9 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100">
                    إيقاف مؤقت
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center dark:bg-slate-900">
                    <ShieldCheck className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا يوجد مساعدين</h3>
                    <p className="text-slate-500 text-sm">أضف حسابات مساعدين ليدخلوا المنصة بصلاحيات محددة.</p>
                </div>
            </div>
        )}
      </div>

      <AddAssistantModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAdd}
      />
    </div>
  );
}
