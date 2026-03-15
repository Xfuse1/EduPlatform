const currencyFormatter = new Intl.NumberFormat('ar-EG')
const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Cairo',
})
export function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number) {
  return `${currencyFormatter.format(amount)} جنيه`
}

export function formatDate(date: Date | string) {
  return dateFormatter.format(new Date(date))
}

export function getCurrentMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Africa/Cairo',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value

  return `${year}-${month}`
}

export function normalizeEgyptianPhone(rawValue: string) {
  const normalizedDigits = rawValue.replace(/[^\d+]/g, '').trim()

  if (!normalizedDigits) {
    return ''
  }

  if (normalizedDigits.startsWith('+20')) {
    return `+20${normalizedDigits.slice(3).replace(/[^\d]/g, '')}`
  }

  if (normalizedDigits.startsWith('20') && normalizedDigits.length === 12) {
    return `+${normalizedDigits}`
  }

  if (normalizedDigits.startsWith('01') && normalizedDigits.length === 11) {
    return `+2${normalizedDigits}`
  }

  return normalizedDigits
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) {
    return 'غير متوفر'
  }

  const normalizedPhone = normalizeEgyptianPhone(phone)

  if (!normalizedPhone.startsWith('+20')) {
    return phone
  }

  return `0${normalizedPhone.slice(3)}`
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) {
    return 'غير متوفر'
  }

  const normalizedPhone = formatPhone(phone)

  if (normalizedPhone.length < 4) {
    return normalizedPhone
  }

  return `${normalizedPhone.slice(0, 3)}***${normalizedPhone.slice(-3)}`
}
