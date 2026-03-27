type LoadingSpinnerProps = {
  message?: string
  fullScreen?: boolean
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function LoadingSpinner({
  message = 'جاري التحميل...',
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <div
      className={joinClasses(
        'flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/70 px-6 py-10 text-center shadow-sm dark:bg-slate-900/60',
        fullScreen && 'min-h-screen',
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-200 dark:bg-sky-900/70" />
        <span className="inline-flex h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-300" />
      </span>

      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  )
}
