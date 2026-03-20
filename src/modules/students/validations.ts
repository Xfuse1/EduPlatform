import { z } from 'zod'

const egyptianMobilePattern = /^01\d{9}$/

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

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = value.trim()
  return normalizedValue === '' ? undefined : normalizedValue
}

function normalizeEgyptianPhone(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedDigits = normalizeDigits(value)
    .replace(/[^\d+]/g, '')
    .trim()

  if (normalizedDigits === '') {
    return undefined
  }

  if (normalizedDigits.startsWith('+20')) {
    return `0${normalizedDigits.slice(3)}`.replace(/[^\d]/g, '')
  }

  if (normalizedDigits.startsWith('20') && normalizedDigits.length === 12) {
    return `0${normalizedDigits.slice(2)}`
  }

  return normalizedDigits.replace(/[^\d]/g, '')
}

export const studentCreateSchema = z.object({
  name: z.string().trim().min(2, 'اسم الطالب يجب أن يكون حرفين على الأقل'),
  phone: z.preprocess(
    normalizeEgyptianPhone,
    z
      .string()
      .regex(egyptianMobilePattern, 'رقم هاتف الطالب يجب أن يكون رقم مصري صحيح')
      .optional(),
  ),
  parentName: z.string().trim().min(2, 'اسم ولي الأمر مطلوب'),
  parentPhone: z.preprocess(
    normalizeEgyptianPhone,
    z
      .string()
      .regex(
        egyptianMobilePattern,
        'رقم ولي الأمر يجب أن يبدأ بـ 01 ويتكون من 11 رقمًا',
      ),
  ),
  gradeLevel: z.string().trim().min(1, 'الصف الدراسي مطلوب'),
  groupId: z.preprocess(
    normalizeOptionalText,
    z.string().trim().min(1).optional(),
  ),
})

export type StudentCreateInput = z.infer<typeof studentCreateSchema>

export function normalizeStudentFormData(input: FormData | Record<string, unknown>) {
  if (input instanceof FormData) {
    const rawEntries = Object.fromEntries(input.entries())

    return {
      ...rawEntries,
      phone: normalizeEgyptianPhone(rawEntries.phone),
      parentPhone: normalizeEgyptianPhone(rawEntries.parentPhone),
      groupId: normalizeOptionalText(rawEntries.groupId),
    }
  }

  return {
    ...input,
    phone: normalizeEgyptianPhone(input.phone),
    parentPhone: normalizeEgyptianPhone(input.parentPhone),
    groupId: normalizeOptionalText(input.groupId),
  }
}

export function parseStudentFormData(input: FormData | Record<string, unknown>) {
  return studentCreateSchema.parse(normalizeStudentFormData(input))
}

export function parseStudentImportRecord(record: Record<string, unknown>) {
  return studentCreateSchema.parse(normalizeStudentFormData(record))
}
