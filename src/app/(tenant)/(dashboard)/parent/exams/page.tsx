import { ParentExams } from "@/modules/dashboard/components/ParentExams";

export const metadata = {
  title: "الامتحانات والتقييمات | EduPlatform",
};

export default function ParentExamsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">الامتحانات والتقييمات</h1>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          تابع مستوى وتطور أبنائك من خلال درجات الامتحانات والتقييمات.
        </p>
      </div>
      <ParentExams />
    </div>
  );
}
