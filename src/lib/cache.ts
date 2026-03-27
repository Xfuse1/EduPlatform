import { env } from '@/config/env'

type RedisJsonResponse<T> = {
  result?: T
}

function canUseHttpRedis() {
  return Boolean(env.REDIS_URL && env.REDIS_TOKEN && env.REDIS_URL.startsWith('http'))
}

function getRedisHeaders() {
  return {
    Authorization: `Bearer ${env.REDIS_TOKEN}`,
  }
}

async function parseRedisResponse<T>(response: Response) {
  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as RedisJsonResponse<T>
  return payload.result ?? null
}

export async function getCacheValue(key: string) {
  if (!canUseHttpRedis() || !env.REDIS_URL) {
    return null
  }

  try {
    const response = await fetch(
      `${env.REDIS_URL}/get/${encodeURIComponent(key)}`,
      {
        headers: getRedisHeaders(),
        cache: 'no-store',
      },
    )

    return parseRedisResponse<string | null>(response)
  } catch {
    return null
  }
}

export async function setCacheValue(
  key: string,
  value: string,
  ttlSeconds?: number,
) {
  if (!canUseHttpRedis() || !env.REDIS_URL) {
    return
  }

  const commandPath = ttlSeconds
    ? `/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(value)}`
    : `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`

  try {
    await fetch(`${env.REDIS_URL}${commandPath}`, {
      headers: getRedisHeaders(),
      cache: 'no-store',
    })
  } catch {
    // Cache failures are intentionally non-blocking.
  }
}

export async function deleteCacheValue(key: string) {
  if (!canUseHttpRedis() || !env.REDIS_URL) {
    return
  }

  try {
    await fetch(`${env.REDIS_URL}/del/${encodeURIComponent(key)}`, {
      headers: getRedisHeaders(),
      cache: 'no-store',
    })
  } catch {
    // Cache failures are intentionally non-blocking.
  }
}
