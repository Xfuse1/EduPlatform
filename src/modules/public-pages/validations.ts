import { z } from 'zod'

import { normalizeEgyptianPhone } from '@/lib/utils'

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

export const publicRegistrationSchema = z.object({
  name: z.string().trim().min(2, 'اسم الطالب مطلوب'),
  phone: z.preprocess(
    normalizePhone,
    z.string().regex(
      egyptianMobileE164Pattern,
      'هاتف الطالب يجب أن يكون بصيغة +2010XXXXXXX',
    ),
  ),
  parentName: z.string().trim().min(2, 'اسم ولي الأمر مطلوب'),
  parentPhone: z.preprocess(
    normalizePhone,
    z.string().regex(
      egyptianMobileE164Pattern,
      'هاتف ولي الأمر يجب أن يكون بصيغة +2010XXXXXXX',
    ),
  ),
  gradeLevel: z.string().trim().min(1, 'الصف الدراسي مطلوب'),
  groupId: z.string().trim().min(1, 'اختر مجموعة واحدة على الأقل'),
})

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>
