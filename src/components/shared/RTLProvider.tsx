import type { HTMLAttributes, ReactNode } from 'react'

type RTLProviderProps = {
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function RTLProvider({
  children,
  className,
  ...props
}: RTLProviderProps) {
  return (
    <div dir="rtl" lang="ar" className={joinClasses('text-start', className)} {...props}>
      {children}
    </div>
  )
}
