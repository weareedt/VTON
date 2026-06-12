// Client-side image helpers. Downscaling before upload cuts latency (PLAN.md §8)
// and keeps base64 payloads under the backend's size limit.

const MAX_EDGE = 1280; // longest side after downscale
const JPEG_QUALITY = 0.85;

// Auto-exposure target for captured frames. Webcams in kiosks often under- or
// over-expose; we nudge the mean brightness toward this and stretch contrast so
// the person photo is well-lit for the try-on model (PLAN.md §8).
const TARGET_LUMA = 122;
const MIN_GAMMA = 0.45; // strongest brightening (very dark frame)
const MAX_GAMMA = 1.5; // strongest darkening (blown-out frame)

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
  return drawScaled(source, sourceWidth, sourceHeight).canvas.toDataURL(
    'image/jpeg',
    JPEG_QUALITY
  );
}

/**
 * Capture a camera frame to a JPEG, with automatic exposure correction so the
 * person photo is well-lit regardless of the webcam/lighting. Use this for the
 * camera step (not garment uploads, where we keep the product's true colors).
 */
export function captureFrameToJpeg(source, sourceWidth, sourceHeight) {
  const { canvas, ctx, w, h } = drawScaled(source, sourceWidth, sourceHeight);
  normalizeExposure(ctx, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

// Shared: draw a source downscaled onto a fresh canvas.
function drawScaled(source, sourceWidth, sourceHeight) {
  const w0 = sourceWidth || source.naturalWidth || source.videoWidth || source.width;
  const h0 = sourceHeight || source.naturalHeight || source.videoHeight || source.height;

  const scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

// Nudge mean brightness toward TARGET_LUMA via a gamma curve. Best-effort; skips
// when the frame is already well-exposed or when the canvas is tainted.
function normalizeExposure(ctx, w, h) {
  let image;
  try {
    image = ctx.getImageData(0, 0, w, h);
  } catch {
    return; // cross-origin tainted canvas — leave as-is
  }
  const d = image.data;

  // Sample mean luminance (skip pixels for speed).
  let sum = 0;
  let count = 0;
  const stride = 4 * 11;
  for (let i = 0; i < d.length; i += stride) {
    sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    count += 1;
  }
  const mean = sum / Math.max(count, 1);
  if (mean <= 1 || mean >= 254) return;

  let gamma = Math.log(TARGET_LUMA / 255) / Math.log(mean / 255);
  gamma = Math.max(MIN_GAMMA, Math.min(MAX_GAMMA, gamma));
  if (Math.abs(gamma - 1) < 0.06) return; // already close enough

  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round(255 * Math.pow(v / 255, gamma));
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(image, 0, 0);
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
