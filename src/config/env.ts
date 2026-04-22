type RequiredEnvKey =
  | 'DATABASE_URL'

type OptionalEnvKey =
  | 'REDIS_URL'
  | 'REDIS_TOKEN'
  | 'SMS_PROVIDER_URL'
  | 'SMS_PROVIDER_API_KEY'
  | 'WHATSAPP_API_URL'
  | 'WHATSAPP_ACCESS_TOKEN'
  | 'NEXT_PUBLIC_DEFAULT_THEME'
  | 'KASHIER_MERCHANT_ID'
  | 'KASHIER_API_KEY'
  | 'KASHIER_WEBHOOK_SECRET'
  | 'KASHIER_SECRET_KEY'
  | 'KASHIER_MODE'
  | 'KASHIER_ALLOWED_METHODS'
  | 'ENCRYPTION_KEY'
  | 'INTERNAL_JOBS_SECRET'
  | 'TEACHER_TRANSFER_FEE_PERCENT'

type EnvConfig = {
  DATABASE_URL: string
  JWT_SECRET: string
  NEXT_PUBLIC_APP_URL: string
  REDIS_URL?: string
  REDIS_TOKEN?: string
  SMS_PROVIDER_URL?: string
  SMS_PROVIDER_API_KEY?: string
  WHATSAPP_API_URL?: string
  WHATSAPP_ACCESS_TOKEN?: string
  NEXT_PUBLIC_DEFAULT_THEME: 'light' | 'dark' | 'system'
  KASHIER_MERCHANT_ID?: string
  KASHIER_API_KEY?: string
  KASHIER_WEBHOOK_SECRET?: string
  KASHIER_SECRET_KEY?: string
  KASHIER_MODE?: 'test' | 'live'
  KASHIER_ALLOWED_METHODS?: string
  ENCRYPTION_KEY?: string
  INTERNAL_JOBS_SECRET?: string
  TEACHER_TRANSFER_FEE_PERCENT: number
}

function readEnv(key: string) {
  const value = process.env[key]

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function requireEnv(key: RequiredEnvKey) {
  const value = readEnv(key)

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

function optionalEnv(key: OptionalEnvKey) {
  return readEnv(key)
}

function validateUrl(value: string, key: string) {
  try {
    return new URL(value).toString()
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL`)
  }
}

function validateTheme(value: string | undefined) {
  if (!value) {
    return 'system' as const
  }

  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  throw new Error(
    'Environment variable NEXT_PUBLIC_DEFAULT_THEME must be one of: light, dark, system',
  )
}

function createEnv(): EnvConfig {
  const appUrl = validateUrl(
    readEnv('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
    'NEXT_PUBLIC_APP_URL',
  )
  const redisUrl = optionalEnv('REDIS_URL')
  const smsProviderUrl = optionalEnv('SMS_PROVIDER_URL')
  const whatsappApiUrl = optionalEnv('WHATSAPP_API_URL')
  const transferFeeRaw = optionalEnv('TEACHER_TRANSFER_FEE_PERCENT')
  const transferFee = transferFeeRaw ? Number(transferFeeRaw) : 0
  const kashierModeRaw = optionalEnv('KASHIER_MODE')
  const kashierMode = kashierModeRaw
    ? kashierModeRaw.toLowerCase()
    : undefined

  if (!Number.isFinite(transferFee) || transferFee < 0 || transferFee > 100) {
    throw new Error('TEACHER_TRANSFER_FEE_PERCENT must be a number between 0 and 100')
  }

  if (kashierMode && kashierMode !== 'test' && kashierMode !== 'live') {
    throw new Error('KASHIER_MODE must be either "test" or "live"')
  }

  return {
    DATABASE_URL: requireEnv('DATABASE_URL'),
    JWT_SECRET: readEnv('JWT_SECRET') ?? 'dev-only-secret-change-me',
    NEXT_PUBLIC_APP_URL: appUrl,
    REDIS_URL: redisUrl ? validateUrl(redisUrl, 'REDIS_URL') : undefined,
    REDIS_TOKEN: optionalEnv('REDIS_TOKEN'),
    SMS_PROVIDER_URL: smsProviderUrl
      ? validateUrl(smsProviderUrl, 'SMS_PROVIDER_URL')
      : undefined,
    SMS_PROVIDER_API_KEY: optionalEnv('SMS_PROVIDER_API_KEY'),
    WHATSAPP_API_URL: whatsappApiUrl
      ? validateUrl(whatsappApiUrl, 'WHATSAPP_API_URL')
      : undefined,
    WHATSAPP_ACCESS_TOKEN: optionalEnv('WHATSAPP_ACCESS_TOKEN'),
    NEXT_PUBLIC_DEFAULT_THEME: validateTheme(
      optionalEnv('NEXT_PUBLIC_DEFAULT_THEME'),
    ),
    KASHIER_MERCHANT_ID: optionalEnv('KASHIER_MERCHANT_ID'),
    KASHIER_API_KEY: optionalEnv('KASHIER_API_KEY'),
    KASHIER_WEBHOOK_SECRET: optionalEnv('KASHIER_WEBHOOK_SECRET'),
    KASHIER_SECRET_KEY: optionalEnv('KASHIER_SECRET_KEY'),
    KASHIER_MODE: kashierMode as 'test' | 'live' | undefined,
    KASHIER_ALLOWED_METHODS: optionalEnv('KASHIER_ALLOWED_METHODS'),
    ENCRYPTION_KEY: optionalEnv('ENCRYPTION_KEY'),
    INTERNAL_JOBS_SECRET: optionalEnv('INTERNAL_JOBS_SECRET'),
    TEACHER_TRANSFER_FEE_PERCENT: transferFee,
  }
}

export const env = createEnv()

