// Standalone try-on smoke test — runs a real engine against two local images and
// saves the result. No frontend / Vercel needed.
//
// Usage (PowerShell):
//   $env:HF_TOKEN="hf_xxxx"            # for the free idmvton engine (recommended)
//   node scripts/test-tryon.mjs idmvton <garment.jpg> <person.jpg>
//
//   # or the paid FASHN engine:
//   $env:FASHN_API_KEY="fa-xxxx"
//   node scripts/test-tryon.mjs fashn <garment.jpg> <person.jpg>
//
// Writes tryon-output.<ext> where you run it.
import { readFile, writeFile } from 'node:fs/promises';
import { getEngine } from '../api/_lib/engines/index.js';
import { parseDataUrl, toDataUrl } from '../api/_lib/images.js';

const [engineName, garmentPath, personPath] = process.argv.slice(2);

if (!engineName || !garmentPath || !personPath) {
  console.error('Usage: node scripts/test-tryon.mjs <engine> <garment.jpg> <person.jpg>');
  console.error('  engines: idmvton (free, needs HF_TOKEN) | fashn (paid) | nanobanana (placeholder)');
  process.exit(1);
}

const engine = getEngine(engineName);
if (!engine) {
  console.error(`Unknown engine "${engineName}".`);
  process.exit(1);
}

async function toDataUrlFromFile(path) {
  const buf = await readFile(path);
  const mime = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  return toDataUrl(buf.toString('base64'), mime);
}

const started = Date.now();
console.log(`Running engine "${engineName}"… (this can take 30-50s on the free HF Space)`);

try {
  const garment = await toDataUrlFromFile(garmentPath);
  const person = await toDataUrlFromFile(personPath);

  const { imageBase64, placeholder } = await engine.run({ garment, person });

  const { base64, mime } = parseDataUrl(imageBase64);
  const ext = (mime || 'image/jpeg').includes('png') ? 'png' : 'jpg';
  const outPath = `tryon-output.${ext}`;
  await writeFile(outPath, Buffer.from(base64, 'base64'));

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Done in ${secs}s  (placeholder=${placeholder})`);
  console.log(`Saved result → ${outPath}`);
} catch (err) {
  console.error(`\n${engineName} test failed:`, err.message);
  if (engineName === 'idmvton') {
    console.error('Tip: set a free HF_TOKEN (huggingface.co → Settings → Access Tokens).');
    console.error('The Space may also be sleeping or at GPU quota — retry in a minute.');
  }
  process.exit(1);
}
