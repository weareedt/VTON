// Small helpers for working with base64 image payloads that travel between the
// kiosk frontend and the providers. Images are never written to disk.

/**
 * Strip a `data:` URL prefix if present, returning the raw base64 payload.
 * Accepts either "data:image/jpeg;base64,XXXX" or a bare "XXXX".
 */
export function stripDataUrl(input) {
  if (typeof input !== 'string') return '';
  const comma = input.indexOf(',');
  if (input.startsWith('data:') && comma !== -1) {
    return input.slice(comma + 1);
  }
  return input;
}

/** Parse a data URL into { mime, base64 }. Defaults mime to image/jpeg. */
export function parseDataUrl(input) {
  if (typeof input === 'string' && input.startsWith('data:')) {
    const match = /^data:([^;,]+)[^,]*,(.*)$/s.exec(input);
    if (match) {
      return { mime: match[1] || 'image/jpeg', base64: match[2] };
    }
  }
  return { mime: 'image/jpeg', base64: stripDataUrl(input) };
}

/** Build a data URL from raw base64 + mime. */
export function toDataUrl(base64, mime = 'image/jpeg') {
  return `data:${mime};base64,${base64}`;
}
