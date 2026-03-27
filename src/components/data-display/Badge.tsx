import type { ReactNode } from 'react'

type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  primary:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100',
  success:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
  danger:
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100',
  info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100',
}

export default function Badge({
  children,
  variant = 'neutral',
  className,
}: BadgeProps) {
  return (
    <span
      className={joinClasses(
        'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
