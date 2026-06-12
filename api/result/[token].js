// GET /api/result/:token — serves a stored result image for the phone that
// scanned the QR code. Returns the raw image bytes with the right content-type.
// Entries auto-expire from KV (PLAN.md §9); a missing/expired token → 404.
import { getResult } from '../_lib/kv.js';
import { parseDataUrl } from '../_lib/images.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token.' });
  }

  const dataUrl = await getResult(token);
  if (!dataUrl) {
    return res.status(404).json({ error: 'Result not found or expired.' });
  }

  const { base64, mime } = parseDataUrl(dataUrl);
  const buffer = Buffer.from(base64, 'base64');

  res.setHeader('Content-Type', mime || 'image/jpeg');
  res.setHeader('Content-Disposition', 'inline; filename="tryon.jpg"');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(buffer);
}
