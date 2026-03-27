export function LoadingState({ message = "جارٍ التحميل..." }: { message?: string }) {
  return (
    <div className="page-enter px-4 py-6">
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900">
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-32 rounded-[16px] bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-52 rounded-[16px] bg-slate-100 dark:bg-slate-800" />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
