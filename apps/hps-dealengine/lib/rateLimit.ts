// apps/hps-dealengine/lib/rateLimit.ts
// Simple in-memory rate limiter (good for dev / single-region). For production, use KV/Upstash.

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function now() {
  return Date.now();
}

function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf && xf.length > 0) return xf.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  return realIp ?? '127.0.0.1';
}

export function checkRateLimit(
  req: Request,
  keyPrefix: string,
  limit: number = 60,
  windowMs: number = 60_000
) {
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const t = now();
  const bucket = store.get(key);

  if (!bucket || t > bucket.resetAt) {
    const resetAt = t + windowMs;
    const next: Bucket = { count: 1, resetAt };
    store.set(key, next);
    return {
      allowed: true,
      headers: rateHeaders(limit - 1, Math.ceil((resetAt - t) / 1000), limit),
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      headers: rateHeaders(0, Math.ceil((bucket.resetAt - t) / 1000), limit),
    };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return {
    allowed: true,
    headers: rateHeaders(limit - bucket.count, Math.ceil((bucket.resetAt - t) / 1000), limit),
  };
}

function rateHeaders(remaining: number, resetSec: number, limit: number) {
  return new Headers({
    'x-ratelimit-limit': String(limit),
    'x-ratelimit-remaining': String(remaining),
    'x-ratelimit-reset': String(resetSec),
  });
}
