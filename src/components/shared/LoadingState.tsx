export function LoadingState({ message = "جارٍ التحميل..." }: { message?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="rounded-3xl border border-dashed bg-white px-6 py-8 text-center shadow-soft">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  );
}
