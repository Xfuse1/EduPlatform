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

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = value.trim()
  return normalizedValue === '' ? undefined : normalizedValue
}

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = normalizeEgyptianPhone(normalizeDigits(value))
  return normalizedValue || value.trim()
}

function normalizeGroupIds(value: unknown) {
  const rawValues = Array.isArray(value) ? value : [value]

  return rawValues
    .flatMap((item) =>
      typeof item === 'string'
        ? item
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    )
    .filter(Boolean)
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value === 'true'
  }

  return false
}

export const studentCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'اسم الطالب يجب أن يكون حرفين على الأقل'),
    phone: z.preprocess(
      normalizePhone,
      z.string().regex(
        egyptianMobileE164Pattern,
        'رقم هاتف الطالب يجب أن يكون بصيغة +2010XXXXXXX',
      ),
    ),
    parentName: z.string().trim().min(2, 'اسم ولي الأمر مطلوب'),
    parentPhone: z.preprocess(
      normalizePhone,
      z.string().regex(
        egyptianMobileE164Pattern,
        'رقم ولي الأمر يجب أن يكون بصيغة +2010XXXXXXX',
      ),
    ),
    gradeLevel: z.string().trim().min(1, 'الصف الدراسي مطلوب'),
    groupIds: z.preprocess(
      normalizeGroupIds,
      z.array(z.string().trim().min(1)).default([]),
    ),
    syncGroups: z.preprocess(normalizeBoolean, z.boolean().default(false)),
  })
  .transform((value) => ({
    ...value,
    groupIds: [...new Set(value.groupIds)],
  }))

export type StudentCreateInput = z.infer<typeof studentCreateSchema>

export function normalizeStudentFormData(input: FormData | Record<string, unknown>) {
  if (input instanceof FormData) {
    const rawEntries = Object.fromEntries(input.entries())
    const groupIds = input.getAll('groupIds')
    const fallbackGroupId = normalizeOptionalText(rawEntries.groupId)

    return {
      ...rawEntries,
      phone: normalizePhone(rawEntries.phone),
      parentPhone: normalizePhone(rawEntries.parentPhone),
      groupIds:
        groupIds.length > 0
          ? groupIds
          : fallbackGroupId
            ? [fallbackGroupId]
            : [],
      syncGroups: normalizeBoolean(rawEntries.syncGroups),
    }
  }

  const fallbackGroupId = normalizeOptionalText(input.groupId)

  return {
    ...input,
    phone: normalizePhone(input.phone),
    parentPhone: normalizePhone(input.parentPhone),
    groupIds: normalizeGroupIds(input.groupIds ?? fallbackGroupId ?? []),
    syncGroups: normalizeBoolean(input.syncGroups),
  }
}

export function parseStudentFormData(input: FormData | Record<string, unknown>) {
  return studentCreateSchema.parse(normalizeStudentFormData(input))
}

export function parseStudentImportRecord(record: Record<string, unknown>) {
  return studentCreateSchema.parse({
    ...normalizeStudentFormData(record),
    syncGroups: true,
  })
}
