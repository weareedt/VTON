// Single call to the backend try-on endpoint.

/**
 * @param {Object} params
 * @param {"fashn"|"nanobanana"} params.engine
 * @param {string} params.garmentImage  base64 / data-url JPEG
 * @param {string} params.personImage   base64 / data-url JPEG
 * @returns {Promise<{ imageBase64: string, placeholder: boolean, token: string|null }>}
 */
export async function postTryOn({ engine, garmentImage, personImage }) {
  const res = await fetch('/api/tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engine, garmentImage, personImage }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

/** Absolute URL for the QR — must be reachable from a phone (uses the live origin). */
export function resultUrlFromToken(token) {
  if (!token) return null;
  return `${window.location.origin}/api/result/${token}`;
}
