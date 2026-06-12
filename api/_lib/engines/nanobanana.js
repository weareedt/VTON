// Nano Banana 2 (Gemini 3.1 Flash Image) — PLACEHOLDER.
//
// This intentionally does NOT call Gemini yet. It echoes the person photo back so
// the entire kiosk flow is testable end-to-end without a Gemini key. The real
// integration is a drop-in replacement that keeps the same run({ garment, person })
// signature and returns the same { imageBase64, placeholder } shape.
import { parseDataUrl, toDataUrl } from '../images.js';

/**
 * Placeholder try-on. Returns the person image unchanged, flagged as a placeholder
 * so the Result screen can show a "Preview (placeholder)" badge.
 */
export async function run({ garment, person }) {
  // garment is accepted for signature parity; unused while this is a stub.
  void garment;
  const { base64, mime } = parseDataUrl(person);
  return { imageBase64: toDataUrl(base64, mime || 'image/jpeg'), placeholder: true };

  // TODO: real Gemini integration.
  //   model: "gemini-3.1-flash-image" (Gemini API / Google AI Studio or Vertex AI)
  //   Send a multi-image generateContent request:
  //     - inlineData part: person image (base64)
  //     - inlineData part: garment image (base64)
  //     - text part: instruction, e.g. "Dress the person in the uploaded garment.
  //       Keep their face, pose, body, and the background unchanged. Match the
  //       garment's color, pattern, text, and logos exactly."
  //   Read GEMINI_API_KEY from env. Response returns image bytes (inlineData) —
  //   convert to a data URL. Note: every output carries a SynthID watermark.
}
