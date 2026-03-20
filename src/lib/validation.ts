import type { ZodError } from 'zod'

export function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = value.trim()
  return normalizedValue === '' ? undefined : normalizedValue
}

export function objectFromFormData(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

export function flattenZodFieldErrors(error: ZodError) {
  const flattenedErrors = error.flatten()
    .fieldErrors as Record<string, string[] | undefined>

  return Object.fromEntries(
    Object.entries(flattenedErrors)
      .map(([key, value]) => [key, value?.[0]])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
}
