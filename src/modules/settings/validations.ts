import { z } from 'zod'

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = value.trim()
  return normalizedValue === '' ? undefined : normalizedValue
}

function normalizeSubjects(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === 'string'
          ? item
              .split(/\r?\n|,/)
              .map((part) => part.trim())
              .filter(Boolean)
          : [item],
      )
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return value
}

// Restrict logo sources to reduce stored-XSS / SSRF surface, since logoUrl is
// rendered as an <img src> on public tenant pages:
// - https URLs only (no plain http, no tracking-prone insecure origins)
// - app-relative upload paths ("/...")
// - data: URIs only for raster image types (never SVG, which can carry script)
const RASTER_DATA_URI = /^data:image\/(png|jpe?g|webp|gif|avif)[;,]/i

function isSupportedLogoValue(value: string) {
  if (value.startsWith('data:')) {
    return RASTER_DATA_URI.test(value)
  }

  return value.startsWith('https://') || value.startsWith('/')
}

export const tenantSettingsSchema = z.object({
  name: z.string().trim().min(2, 'اسم المؤسسة مطلوب'),
  logoUrl: z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .trim()
      .refine(isSupportedLogoValue, 'صيغة الشعار غير مدعومة')
      .optional(),
  ),
  bio: z.preprocess(
    normalizeOptionalText,
    z.string().trim().max(500, 'الوصف يجب ألا يزيد عن 500 حرف').optional(),
  ),
  subjects: z.preprocess(
    normalizeSubjects,
    z.array(z.string().trim().min(1)).min(1, 'أضف مادة واحدة على الأقل'),
  ),
  region: z.preprocess(
    normalizeOptionalText,
    z.string().trim().max(120, 'اسم المنطقة طويل جدًا').optional(),
  ),
})

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>

export function normalizeTenantSettingsFormData(
  input: FormData | Record<string, unknown>,
) {
  if (input instanceof FormData) {
    const rawEntries = Object.fromEntries(input.entries())
    const subjects = input.getAll('subjects')

    return {
      ...rawEntries,
      logoUrl: normalizeOptionalText(rawEntries.logoUrl),
      bio: normalizeOptionalText(rawEntries.bio),
      region: normalizeOptionalText(rawEntries.region),
      subjects: subjects.length > 0 ? subjects : rawEntries.subjects,
    }
  }

  return {
    ...input,
    logoUrl: normalizeOptionalText(input.logoUrl),
    bio: normalizeOptionalText(input.bio),
    region: normalizeOptionalText(input.region),
    subjects: normalizeSubjects(input.subjects),
  }
}

export function parseTenantSettingsFormData(
  input: FormData | Record<string, unknown>,
) {
  return tenantSettingsSchema.parse(normalizeTenantSettingsFormData(input))
}
