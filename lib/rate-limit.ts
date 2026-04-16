/**
 * Simple in-memory rate limiter.
 *
 * Note: on serverless platforms (Vercel) each function instance has its own
 * memory, so this provides per-instance limiting. It's still effective against
 * most abuse patterns and requires no external dependencies.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

/**
 * @param key      Unique key, e.g. `register:1.2.3.4`
 * @param limit    Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

/** Extract the best-guess client IP from a request */
export function getClientIp(req: Request): string {
  const forwarded = (req.headers as Headers).get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
