/**
 * Best-effort in-memory rate limiter (sliding window).
 *
 * NOTE: state lives in the process memory, so in a multi-instance / serverless
 * deployment each instance keeps its own counters. This significantly raises the
 * cost of scripted abuse (brute force, SMS bombing, enumeration) but is NOT a
 * substitute for a shared store (Redis/Upstash) in a horizontally-scaled prod.
 * Swap the Map for a shared store when one is available.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the Map cannot grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * Consume one unit from the bucket identified by `key`.
 * @param key      unique key (e.g. `pin:${phone}` or `otp:${ip}`)
 * @param limit    max events allowed within the window
 * @param windowMs window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

/** Clear a bucket (e.g. after a successful login resets the failure counter). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
