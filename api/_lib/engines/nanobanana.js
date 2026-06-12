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

// Forceful, explicit prompt — Gemini will often return the input nearly unchanged
// if the instruction is timid, so we command the edit directly. Override at
// runtime with the NANOBANANA_PROMPT env var (no code change needed).
const DEFAULT_PROMPT = [
  'You are a virtual try-on system. You are given two images:',
  'IMAGE 1 is a photo of a person. IMAGE 2 is a clothing garment shown on its own.',
  '',
  'TASK: Produce a NEW, edited photo of the person from IMAGE 1 actually WEARING',
  'the garment from IMAGE 2. You MUST remove the clothing the person is currently',
  'wearing and replace it with the garment from IMAGE 2 fitted naturally onto their body.',
  '',
  'STRICT REQUIREMENTS:',
  "- Keep the person's face, hairstyle, skin tone, body shape, and pose EXACTLY the same.",
  '- Keep the background and lighting the same.',
  '- Change ONLY the clothing. Fit the new garment realistically with natural folds,',
  '  shadows, and correct proportions for the body.',
  "- Reproduce the garment's exact color, pattern, texture, logos, and any text from IMAGE 2.",
  '- The result must clearly show the person dressed in the NEW garment, not their original outfit.',
  '',
  'Do NOT return IMAGE 1 unchanged. Output exactly one photorealistic image of the',
  'person wearing the new garment.',
].join('\n');

const PROMPT = process.env.NANOBANANA_PROMPT || DEFAULT_PROMPT;

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
