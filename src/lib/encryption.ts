import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

import { env } from '@/config/env'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not configured')
  }

  const isHex = /^[0-9a-fA-F]+$/.test(key)
  const keyBuffer = isHex ? Buffer.from(key, 'hex') : Buffer.from(key, 'utf8')

  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes')
  }

  return keyBuffer
}

export function encryptKashierKey(plainText: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptKashierKey(cipherText: string): string {
  const [ivB64, tagB64, dataB64] = cipherText.split(':')

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const encrypted = Buffer.from(dataB64, 'base64')

  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

