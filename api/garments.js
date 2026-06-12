// GET /api/garments — lists the pre-stored garment library at runtime so new
// garments appear without rebuilding the app. Images live in a served folder
// (client/public/garments); this returns their names + URLs.
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

// Where the garment images live, tried in order (covers dev and Vercel layouts).
function candidateDirs() {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'client/public/garments'),
    path.join(cwd, 'client/dist/garments'),
    path.join(cwd, 'public/garments'),
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  for (const dir of candidateDirs()) {
    try {
      const files = (await readdir(dir)).filter((f) => IMAGE_EXT.test(f));
      const garments = files
        .sort((a, b) => a.localeCompare(b))
        .map((file) => ({
          name: file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          url: `/garments/${encodeURIComponent(file)}`,
        }));
      return res.status(200).json({ garments });
    } catch {
      /* directory doesn't exist here — try the next candidate */
    }
  }
  // No library folder found — return empty so the UI shows the upload option.
  return res.status(200).json({ garments: [] });
}
