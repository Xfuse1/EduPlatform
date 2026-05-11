'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

type AdminFinanceSelectOption = {
  value: string
  label: string
}

export function AdminFinanceSelect({
  name,
  defaultValue = '',
  options,
  className = '',
}: {
  name: string
  defaultValue?: string
  options: AdminFinanceSelectOption[]
  className?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  )

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <input name={name} type="hidden" value={value} />
      <button
        type="button"
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-sky-300/20 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 outline-none transition hover:border-sky-300/40 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/15"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-100 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-sky-300/20 bg-slate-950 shadow-2xl shadow-slate-950/40">
          <div className="max-h-56 overflow-auto py-1">
            {options.map((option) => {
              const selected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`block w-full px-3 py-2.5 text-right text-sm font-semibold transition ${
                    selected
                      ? 'bg-cyan-400/15 text-cyan-100'
                      : 'text-slate-200 hover:bg-sky-300/10 hover:text-white'
                  }`}
                  onClick={() => {
                    setValue(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
