import { z } from 'zod'

import type { DayOfWeek } from '@/types'

export const GROUP_DAY_VALUES = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const satisfies readonly DayOfWeek[]

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const groupDaySchema = z.enum(GROUP_DAY_VALUES)

function normalizeDays(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((day) => (typeof day === 'string' ? day.trim().toLowerCase() : day))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((day) => day.trim().toLowerCase())
      .filter(Boolean)
  }

  return value
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = value.trim()
  return normalizedValue === '' ? undefined : normalizedValue
}

function getMinutesFromTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export const groupCreateSchema = z
  .object({
    name: z.string().trim().min(3, 'اسم المجموعة يجب أن يكون 3 أحرف على الأقل'),
    subject: z.string().trim().min(1, 'المادة مطلوبة'),
    gradeLevel: z.string().trim().min(1, 'الصف الدراسي مطلوب'),
    days: z.preprocess(
      normalizeDays,
      z
        .array(groupDaySchema)
        .min(1, 'يجب اختيار يوم واحد على الأقل')
        .transform((days) => [...new Set(days)]),
    ),
    timeStart: z
      .string()
      .trim()
      .regex(timePattern, 'وقت البداية يجب أن يكون بصيغة HH:mm'),
    timeEnd: z
      .string()
      .trim()
      .regex(timePattern, 'وقت النهاية يجب أن يكون بصيغة HH:mm'),
    maxCapacity: z.coerce
      .number()
      .int('الحد الأقصى يجب أن يكون رقمًا صحيحًا')
      .min(1, 'الحد الأدنى للطلاب 1')
      .max(200, 'الحد الأقصى للطلاب 200'),
    monthlyFee: z.coerce
      .number()
      .int('المصاريف الشهرية يجب أن تكون رقمًا صحيحًا')
      .min(0, 'المصاريف الشهرية لا يمكن أن تكون سالبة'),
    color: z
      .string()
      .trim()
      .regex(hexColorPattern, 'اللون يجب أن يكون بصيغة hex مثل #1A5276'),
    room: z.preprocess(
      normalizeOptionalText,
      z.string().trim().max(100, 'اسم القاعة طويل جدًا').optional(),
    ),
  })
  .superRefine((value, ctx) => {
    if (getMinutesFromTime(value.timeEnd) <= getMinutesFromTime(value.timeStart)) {
      ctx.addIssue({
        code: 'custom',
        message: 'وقت النهاية يجب أن يكون بعد وقت البداية',
        path: ['timeEnd'],
      })
    }
  })

export type GroupCreateInput = z.infer<typeof groupCreateSchema>

export function normalizeGroupFormData(input: FormData | Record<string, unknown>) {
  if (input instanceof FormData) {
    const rawEntries = Object.fromEntries(input.entries())
    const days = input
      .getAll('days')
      .map((day) => (typeof day === 'string' ? day : ''))
      .filter(Boolean)

    return {
      ...rawEntries,
      days: days.length > 0 ? days : rawEntries.days,
      room: normalizeOptionalText(rawEntries.room),
    }
  }

  return {
    ...input,
    room: normalizeOptionalText(input.room),
  }
}

export function parseGroupFormData(input: FormData | Record<string, unknown>) {
  return groupCreateSchema.parse(normalizeGroupFormData(input))
}
