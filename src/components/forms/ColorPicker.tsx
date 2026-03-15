'use client'

type ColorPickerProps = {
  name?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const COLOR_PRESETS = [
  '#1A5276',
  '#2E86C1',
  '#117A65',
  '#AF601A',
  '#B03A2E',
  '#6C3483',
] as const

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizeColor(value: string) {
  const normalizedValue = value.trim()

  if (!normalizedValue.startsWith('#')) {
    return `#${normalizedValue}`
  }

  return normalizedValue
}

export default function ColorPicker({
  name = 'color',
  value,
  onChange,
  disabled = false,
}: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((preset) => {
          const active = preset.toLowerCase() === value.toLowerCase()

          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              disabled={disabled}
              aria-label={`اختيار اللون ${preset}`}
              className={joinClasses(
                'h-10 w-10 rounded-2xl border-2 transition-transform hover:scale-105',
                active
                  ? 'border-slate-950 ring-2 ring-offset-2 dark:border-white dark:ring-slate-300 dark:ring-offset-slate-950'
                  : 'border-white dark:border-slate-950',
                disabled && 'cursor-not-allowed opacity-60 hover:scale-100',
              )}
              style={{ backgroundColor: preset }}
            />
          )
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          disabled={disabled}
          className="h-12 w-full cursor-pointer rounded-2xl border border-slate-200 bg-transparent p-1 sm:w-20 dark:border-slate-700"
        />

        <input
          type="text"
          name={name}
          value={value}
          readOnly
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
          dir="ltr"
        />
      </div>
    </div>
  )
}
