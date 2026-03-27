import type { ReactNode } from 'react'

type EmptyStateProps = {
  title?: string
  message?: string
  icon?: ReactNode
  action?: ReactNode
}

function DefaultIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M7 7h10M7 12h6m-6 5h10M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function EmptyState({
  title = 'لا توجد بيانات',
  message = 'لا يوجد محتوى لعرضه الآن.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
        {icon ?? <DefaultIcon />}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {message}
      </p>

      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
