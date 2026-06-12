// Client-side image helpers. Downscaling before upload cuts latency (PLAN.md §8)
// and keeps base64 payloads under the backend's size limit.

const MAX_EDGE = 1280; // longest side after downscale
const JPEG_QUALITY = 0.85;

/**
 * Read a File into an upright, downscaled JPEG data URL.
 * Phone photos are often stored sideways with an EXIF orientation tag; we apply
 * that orientation so the image is physically upright before upload.
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function fileToScaledJpeg(file) {
  // Preferred path: createImageBitmap bakes in EXIF orientation ('from-image').
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const out = scaleImageToJpeg(bitmap, bitmap.width, bitmap.height);
      bitmap.close?.();
      return out;
    } catch {
      /* fall through to the <img> path below */
    }
  }
  // Fallback for older browsers (orientation may not be applied).
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  return scaleImageToJpeg(img);
}

/** Scale a loaded <img>/<video>/ImageBitmap to a JPEG data URL. */
export function scaleImageToJpeg(source, sourceWidth, sourceHeight) {
  const w = sourceWidth || source.naturalWidth || source.videoWidth || source.width;
  const h = sourceHeight || source.naturalHeight || source.videoHeight || source.height;

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, outW, outH);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = src;
  });
}
