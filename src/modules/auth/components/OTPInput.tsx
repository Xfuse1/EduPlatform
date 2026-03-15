'use client'

type OTPInputProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function OTPInput({
  value,
  onChange,
  disabled,
}: OTPInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="otp-code"
        className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
      >
        رمز التحقق
      </label>
      <input
        id="otp-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, '').slice(0, 6))
        }
        className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
        placeholder="000000"
      />
    </div>
  )
}
