# Garment library

Drop garment images in this folder and they appear in the kiosk's "Choose a
garment" screen — **no rebuild needed**. Just refresh the kiosk.

(The running server lists this folder at `/api/garments` and serves the images
at `/garments/<file>`. Adding/removing a file takes effect on the next refresh.)

## How to add a garment
1. Save the image here as `.jpg`, `.jpeg`, `.png`, or `.webp`.
2. The **file name becomes the label** (dashes/underscores → spaces):
   - `batik-shirt.jpg` → "batik shirt"
   - `white_tee.png` → "white tee"
3. Refresh the kiosk. Done.

## Image tips (for best try-on results)
- **Upper-body garments only** (shirt, baju, blouse, dress) — the IDM-VTON engine
  doesn't handle pants/skirts well.
- Front view, garment fully laid out (flat-lay or ghost-mannequin product shot).
- Plain/white background, garment isolated.
- Portrait or square; at least ~768 px on the short side.
- Make sure it's upright — phone photos can be sideways. Fix with
  `.\scripts\fix-rotation.ps1 <file>` from the project root.

## Note on hosting
On a local kiosk (`npm run serve`), adding files here needs no rebuild.
On Vercel (static hosting), the files are bundled at deploy time, so updating the
library there means committing the new images and pushing (Vercel redeploys).
