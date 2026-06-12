// Nano Banana 2 (Gemini Flash Image) — REAL integration.
//
// Not a dedicated try-on model: we pass the person + garment as reference images
// with an instruction prompt and ask it to dress the person (PLAN.md §4/§7).
// Every output carries a SynthID watermark. Fast, no polling — fits serverless.
//
// Config:
//   GEMINI_API_KEY  (required)  — free key from Google AI Studio.
//   GEMINI_MODEL    (optional)  — defaults to the FREE gemini-2.5-flash-image
//                                 (500 imgs/day). Set to gemini-3.1-flash-image
//                                 for the paid "Nano Banana 2".
import { parseDataUrl } from '../images.js';
import { EngineConfigError } from '../errors.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash-image';

const PROMPT =
  'The first image is a person. The second image is a clothing garment. ' +
  'Generate a realistic photo of the exact same person wearing that garment. ' +
  "Keep the person's face, hair, body shape, pose, and the background unchanged. " +
  "Replace only their clothing. Match the garment's color, pattern, text, and " +
  'details as accurately as possible. Output a single photorealistic image.';

export async function run({ garment, person }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new EngineConfigError('Nano Banana not configured: set GEMINI_API_KEY.');
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const personPart = toInlinePart(person);
  const garmentPart = toInlinePart(garment);

  const res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: PROMPT }, personPart, garmentPart],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });

  if (!res.ok) {
    const detail = await safeText(res);
    throw new Error(`Gemini request failed (${res.status}): ${detail}`);
  }

  const json = await res.json();

  // Blocked / no candidate.
  const blocked = json?.promptFeedback?.blockReason;
  if (blocked) throw new Error(`Gemini blocked the request: ${blocked}`);

  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const inline = imgPart?.inlineData || imgPart?.inline_data;
  if (!inline?.data) {
    const finish = json?.candidates?.[0]?.finishReason || 'no image returned';
    throw new Error(`Gemini returned no image (${finish}).`);
  }

  const mime = inline.mimeType || inline.mime_type || 'image/png';
  return { imageBase64: `data:${mime};base64,${inline.data}`, placeholder: false };
}

// Build a Gemini inline_data image part from a base64/data-url image.
function toInlinePart(image) {
  const { base64, mime } = parseDataUrl(image);
  return { inline_data: { mime_type: mime || 'image/jpeg', data: base64 } };
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
