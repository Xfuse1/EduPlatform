import { z } from 'zod'

import { normalizeEgyptianPhone } from '@/lib/utils'

const otpCodePattern = /^\d{6}$/
const egyptianMobileE164Pattern = /^\+201\d{9}$/

const arabicDigitsMap: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => arabicDigitsMap[digit] ?? digit)
}

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = normalizeEgyptianPhone(normalizeDigits(value))
  return normalizedValue || value.trim()
}

function normalizeOtpCode(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  return normalizeDigits(value).replace(/\D/g, '').trim()
}

export const sendOtpSchema = z.object({
  phone: z.preprocess(
    normalizePhone,
    z.string().regex(
      egyptianMobileE164Pattern,
      'رقم الهاتف يجب أن يكون بصيغة +2010XXXXXXX',
    ),
  ),
})

export const verifyOtpSchema = z.object({
  phone: z.preprocess(
    normalizePhone,
    z.string().regex(
      egyptianMobileE164Pattern,
      'رقم الهاتف يجب أن يكون بصيغة +2010XXXXXXX',
    ),
  ),
  code: z.preprocess(
    normalizeOtpCode,
    z.string().regex(otpCodePattern, 'رمز التحقق يجب أن يتكون من 6 أرقام'),
  ),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
