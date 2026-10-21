/**
 * A token bucket, in process.
 *
 * It guards three things: the sign-up and sign-in endpoints, the endpoints
 * that send a message, and the public endpoints that anyone can call. The
 * redirect path has its own limit, because a link click must never be
 * rejected — but a token bucket on a single machine is the honest amount of
 * rate limiting a self-hosted install can do on its own.
 *
 * A deployment with more than one node puts a reverse proxy in front, and
 * the proxy does the limiting. The limits here are the second line, not the
 * only line.
 *
 * The bucket count is bounded: expired buckets are swept as the map is
 * written to, so a long-running server does not grow without limit.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
  lastSeen: number;
}

const buckets = new Map<string, Bucket>();

/** How many buckets are kept before the oldest idle ones are swept. */
const SWEEP_AT = 10_000;

/** A bucket that has not been touched for this long is dropped. */
const IDLE_MS = 15 * 60 * 1000;

export interface RateResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the bucket has a token again. */
  retryAfter: number;
}

/**
 * Take one token from the bucket named `key`.
 *
 * `limit` is the number of requests allowed in `windowMs`. The bucket
 * refills continuously rather than resetting on a timer, so a caller that
 * spreads its requests over the window is not cut off at the boundary.
 */
export function take(key: string, limit: number, windowMs: number, now = Date.now()): RateResult {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit, updatedAt: now, lastSeen: now };
    buckets.set(key, bucket);
    sweep(now);
  }

  const refillRate = limit / windowMs;
  const elapsed = Math.max(0, now - bucket.updatedAt);
  bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
  bucket.updatedAt = now;
  bucket.lastSeen = now;

  if (bucket.tokens < 1) {
    const waitMs = Math.ceil((1 - bucket.tokens) / refillRate);
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil(waitMs / 1000)) };
  }

  bucket.tokens -= 1;
  return { ok: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
}

/** How many tokens are left, without taking one. */
export function remaining(key: string, limit: number, windowMs: number, now = Date.now()): number {
  const bucket = buckets.get(key);
  if (!bucket) return limit;
  const refillRate = limit / windowMs;
  const elapsed = Math.max(0, now - bucket.updatedAt);
  return Math.floor(Math.min(limit, bucket.tokens + elapsed * refillRate));
}

/** Forget a bucket, so a successful sign-in does not carry over its limit. */
export function reset(key: string): void {
  buckets.delete(key);
}

function sweep(now: number): void {
  if (buckets.size < SWEEP_AT) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastSeen > IDLE_MS) buckets.delete(key);
  }
}

/**
 * The caller's address, as far as the server can tell.
 *
 * A proxy in front of the app sets `x-forwarded-for`; the first entry is
 * the original caller. Without a proxy it is the socket address. Either
 * way this is a hint, not an identity, so it only ever keys a rate limit.
 */
export function callerAddress(request: Request): string {
  return addressOf(request.headers);
}

/** The same, for a page that has headers but no request. */
export function addressOf(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

/** The standard headers for a 429. */
export function limitHeaders(result: RateResult, limit: number): Record<string, string> {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
