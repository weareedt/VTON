// FASHN v1.6 — REAL integration. Purpose-built virtual try-on.
// Submit-then-poll async API. Keys live in the FASHN_API_KEY env var (server only).
import { toDataUrl, parseDataUrl } from '../images.js';

const FASHN_BASE = 'https://api.fashn.ai/v1';

// Error subclass so the route can map a missing key to a 503 instead of a 500.
export class EngineConfigError extends Error {}

const POLL_INTERVAL_MS = 1500;
// Leave headroom under the function maxDuration (60s). FASHN Performance ~7s.
const POLL_TIMEOUT_MS = 50000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a try-on. `garment` and `person` are base64 (data-URL or bare) JPEGs.
 * Returns { imageBase64: <data-url>, placeholder: false }.
 */
export async function run({ garment, person }) {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    throw new EngineConfigError('FASHN not configured: set FASHN_API_KEY.');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // FASHN accepts data URLs for the image inputs.
  const modelImage = toFashnInput(person);
  const garmentImage = toFashnInput(garment);

  // 1. Submit the prediction.
  const submitRes = await fetch(`${FASHN_BASE}/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model_name: 'tryon-v1.6',
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        output_format: 'jpeg',
        return_base64: true,
        mode: 'performance',
      },
    }),
  });

  if (!submitRes.ok) {
    throw new Error(`FASHN submit failed (${submitRes.status}): ${await safeText(submitRes)}`);
  }
  const submitJson = await submitRes.json();
  const id = submitJson.id;
  if (!id) throw new Error('FASHN submit returned no prediction id.');

  // 2. Poll status until completed / failed / timeout.
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const statusRes = await fetch(`${FASHN_BASE}/status/${id}`, { headers });
    if (!statusRes.ok) {
      throw new Error(`FASHN status failed (${statusRes.status}): ${await safeText(statusRes)}`);
    }
    const statusJson = await statusRes.json();
    const status = statusJson.status;

    if (status === 'completed') {
      const output = Array.isArray(statusJson.output) ? statusJson.output[0] : statusJson.output;
      if (!output) throw new Error('FASHN completed but returned no output.');
      // With return_base64 the output is a base64 string (possibly a data URL already).
      const { base64, mime } = parseDataUrl(output);
      return { imageBase64: toDataUrl(base64, mime || 'image/jpeg'), placeholder: false };
    }
    if (status === 'failed' || status === 'error' || status === 'canceled') {
      throw new Error(`FASHN prediction ${status}: ${JSON.stringify(statusJson.error ?? '')}`);
    }
    // statuses like "starting" | "in_queue" | "processing" → keep polling.
  }

  throw new Error('FASHN timed out before completing.');
}

// Pass image inputs to FASHN as data URLs.
function toFashnInput(image) {
  const { base64, mime } = parseDataUrl(image);
  return toDataUrl(base64, mime || 'image/jpeg');
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
