// Short-lived store for the result image, used only to back the QR download.
// Backed by Upstash Redis (the successor to Vercel KV) when configured; otherwise
// no-ops so the QR feature degrades gracefully (client-side download still works).
//
// Stores ONLY the generated result — never the input face photo. Entries carry a
// TTL so they auto-purge (PDPA, PLAN.md §9).
import { randomBytes } from 'node:crypto';

const RESULT_TTL_SECONDS = 5 * 60; // 5 minutes

// The Upstash/Vercel integration injects credentials under either naming scheme.
function redisCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

// Lazy import + construct so the module loads even when creds are absent.
async function getRedis() {
  const creds = redisCreds();
  if (!creds) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis(creds);
}

function newToken() {
  return randomBytes(16).toString('hex');
}

/**
 * Store a result image (data URL) under a random token with a TTL.
 * Returns the token, or null if Redis isn't configured.
 */
export async function putResult(imageDataUrl) {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const token = newToken();
    await redis.set(`result:${token}`, imageDataUrl, { ex: RESULT_TTL_SECONDS });
    return token;
  } catch (err) {
    console.error('KV putResult failed:', err?.message);
    return null;
  }
}

/**
 * Fetch a stored result image (data URL) by token, or null if missing/expired.
 */
export async function getResult(token) {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    return await redis.get(`result:${token}`);
  } catch (err) {
    console.error('KV getResult failed:', err?.message);
    return null;
  }
}
