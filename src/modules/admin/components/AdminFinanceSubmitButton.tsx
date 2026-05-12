'use client'

import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

export function AdminFinanceSubmitButton({
  children,
  className = '',
  pending: pendingOverride,
}: {
  children: ReactNode
  className?: string
  pending?: boolean
}) {
  const { pending: formPending } = useFormStatus()
  const pending = pendingOverride ?? formPending

  return (
    <button
      aria-busy={pending}
      className={`relative inline-flex items-center justify-center ${className} ${pending ? 'cursor-wait opacity-90' : ''}`}
      disabled={pending}
      type="submit"
    >
      <span className={pending ? 'invisible' : ''}>{children}</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
      ) : null}
    </button>
  )
}
