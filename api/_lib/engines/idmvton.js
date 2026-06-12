// IDM-VTON via the free Hugging Face Space (yisol/IDM-VTON) — the "Accurate" engine.
//
// This is a FREE option for testing: it calls a public HF Gradio Space, the same
// kind of model as Kling/Kolors. Trade-offs vs a paid API:
//   - Reliability: it's a shared ZeroGPU demo. Set HF_TOKEN (free huggingface.co
//     read token) to get your own GPU quota; without it, anonymous calls hit
//     "GPU quota exceeded" quickly.
//   - Speed: ~30-50s per image (denoise_steps=30). Slower than a paid API.
//   - Not for production traffic (HF fair-use). Great for proving the flow.
//
// Same run({ garment, person }) signature as the other engines, so it's a drop-in.
import { parseDataUrl } from '../images.js';

const SPACE = 'yisol/IDM-VTON';
const DENOISE_STEPS = 30;
const SEED = 42;

/** base64 (data-url or bare) → Blob for the Gradio client. */
function toBlob(image) {
  const { base64, mime } = parseDataUrl(image);
  return new Blob([Buffer.from(base64, 'base64')], { type: mime || 'image/jpeg' });
}

export async function run({ garment, person }) {
  const { Client } = await import('@gradio/client');

  const personBlob = toBlob(person);
  const garmentBlob = toBlob(garment);

  // HF_TOKEN is optional but strongly recommended for quota. Anonymous may fail.
  const hfToken = process.env.HF_TOKEN || undefined;

  let app;
  try {
    app = await Client.connect(SPACE, hfToken ? { hf_token: hfToken } : undefined);
  } catch (err) {
    throw new Error(`Could not connect to HF Space ${SPACE}: ${err?.message}`);
  }

  // /tryon inputs (in order):
  //   0: ImageEditor dict — the person photo goes in `background`
  //   1: garm_img (garment)
  //   2: garment_des (text)
  //   3: is_checked        — auto-generate the mask (needed, we have no manual mask)
  //   4: is_checked_crop   — auto-crop
  //   5: denoise_steps
  //   6: seed
  const result = await app.predict('/tryon', [
    { background: personBlob, layers: [], composite: null },
    garmentBlob,
    'garment',
    true,
    false,
    DENOISE_STEPS,
    SEED,
  ]);

  // Output: [ resultImage, maskedImage ]. resultImage is a FileData with a .url.
  const output = Array.isArray(result?.data) ? result.data[0] : null;
  const url = output?.url || output?.path;
  if (!url) {
    throw new Error('IDM-VTON returned no output image.');
  }

  // Fetch the generated image and return it as a data URL.
  const imgRes = await fetch(url);
  if (!imgRes.ok) {
    throw new Error(`Could not fetch IDM-VTON result (${imgRes.status}).`);
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const mime = imgRes.headers.get('content-type') || 'image/png';
  return { imageBase64: `data:${mime};base64,${buf.toString('base64')}`, placeholder: false };
}
