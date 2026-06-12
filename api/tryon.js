// POST /api/tryon — the single internal endpoint the kiosk calls.
// body: { engine: "fashn" | "nanobanana", garmentImage: <base64>, personImage: <base64> }
// → { imageBase64: <data-url>, placeholder: boolean, token: string|null }
//
// Holds images in memory only for the request. Never writes them to disk and never
// logs image contents (PLAN.md §9).
import { getEngine, EngineConfigError } from './_lib/engines/index.js';
import { putResult } from './_lib/kv.js';

export const config = {
  maxDuration: 60,
  api: { bodyParser: { sizeLimit: '15mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { engine, garmentImage, personImage } = req.body || {};

  const selected = getEngine(engine);
  if (!selected) {
    return res.status(400).json({ error: `Unknown engine "${engine}".` });
  }
  if (!garmentImage || !personImage) {
    return res.status(400).json({ error: 'Both garmentImage and personImage are required.' });
  }

  try {
    const { imageBase64, placeholder } = await selected.run({
      garment: garmentImage,
      person: personImage,
    });

    // Best-effort: stash the result for the QR download. Null when KV is absent.
    const token = await putResult(imageBase64);

    return res.status(200).json({ imageBase64, placeholder: Boolean(placeholder), token });
  } catch (err) {
    if (err instanceof EngineConfigError) {
      return res.status(503).json({ error: err.message });
    }
    // Don't leak internals or image data; log only the message.
    console.error(`tryon[${engine}] failed:`, err?.message);
    return res.status(502).json({ error: 'Try-on failed. Please try again.' });
  }
}
