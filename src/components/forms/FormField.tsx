import type { ReactNode } from 'react'

type FormFieldProps = {
  children: ReactNode
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function FormField({
  children,
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
}: FormFieldProps) {
  return (
    <div className={joinClasses('space-y-2', className)}>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <label htmlFor={htmlFor}>{label}</label>
        {required ? <span className="text-rose-600 dark:text-rose-400">*</span> : null}
      </div>

      {children}

      {error ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}
