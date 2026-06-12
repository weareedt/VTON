# Try-on engines

All engines implement the same interface, so the frontend doesn't care which one
runs — it just sends `{ engine, garment, person }` to `/api/tryon`.

```js
// api/_lib/engines/<name>.js
export async function run({ garment, person }) {
  // garment, person: base64 (data-url or bare) JPEG/PNG
  return { imageBase64: '<data-url>', placeholder: false };
}
```

Engines are registered in [`api/_lib/engines/index.js`](../api/_lib/engines/index.js).
The `engine` string the frontend sends is the registry key.

| Engine key | Label in UI | Status |
|---|---|---|
| `nanobanana` | Nano Banana | Accurate, realistic results — Google Gemini |
| `idmvton` | IDM-VTON | Experimental — free Hugging Face Space |
| `fashn` | — | Wired up, not shown in UI (paid, production option) |

---

## IDM-VTON (`idmvton`)

- **What:** [`yisol/IDM-VTON`](https://huggingface.co/spaces/yisol/IDM-VTON) Hugging
  Face Space, called via `@gradio/client`.
- **Cost:** free (no per-image charge). Needs a free `HF_TOKEN` for GPU quota.
- **Speed:** ~30–50s (shared free GPU).
- **Limits:** upper-body garments only (tops/dresses, not pants). Free ZeroGPU has
  a daily quota; a HF Pro account raises it. It's a shared community demo — can
  queue, slow down, or go offline. Not for production traffic (HF fair-use).
- **Config:** `HF_TOKEN`.

## Nano Banana (`nanobanana`)

- **What:** Google **Gemini Flash Image** via the `generateContent` REST API. Not a
  dedicated try-on model — it's given the person + garment as reference images plus
  a forceful try-on prompt.
- **Cost:** `gemini-2.5-flash-image` has a free tier; image generation may require
  **billing enabled** on the Google Cloud project. `gemini-3.1-flash-image` (paid,
  ~5–15¢/image) gives better quality.
- **Speed:** a few seconds, no polling — the most Vercel-friendly engine.
- **Notes:** in practice this gives the most accurate, realistic try-on of the
  available engines. Every output carries an invisible **SynthID** watermark. A
  timid prompt makes it return the input nearly unchanged — the built-in prompt is
  deliberately forceful.
- **Config:** `GEMINI_API_KEY`, optional `GEMINI_MODEL`, optional `NANOBANANA_PROMPT`.

## FASHN (`fashn`)

- **What:** [FASHN v1.6](https://fashn.ai) — a purpose-built try-on API (submit + poll).
- **Cost:** paid, ~$0.075/image. Most accurate clothing swap.
- **Status:** implemented in [`fashn.js`](../api/_lib/engines/fashn.js) but not shown
  in the UI. To use it, point an engine card at `fashn` (see below) and set
  `FASHN_API_KEY`.
- **Config:** `FASHN_API_KEY`.

---

## Switching which engine a card uses

The engine cards are defined in
[`client/src/screens/EngineSelect.jsx`](../client/src/screens/EngineSelect.jsx).
Each card has an `id` that must match a registry key. For example, to make the
IDM-VTON card use FASHN instead, change its `id` from `idmvton` to `fashn` and set
`FASHN_API_KEY`.

## Adding a new engine

1. Create `api/_lib/engines/<name>.js` exporting `run({ garment, person })`.
2. Register it in `api/_lib/engines/index.js`.
3. (Optional) add a card for it in `EngineSelect.jsx`, or call it from the test script.
4. Throw `EngineConfigError` (from `../errors.js`) for missing config so it maps to
   a clean 503 instead of a 500.

## Reliable paid alternatives for IDM-VTON

For a production kiosk, the free HF Space is unreliable. The same IDM-VTON model is
hosted, fast and pay-as-you-go (~$0.02–0.05/image), on:

- **fal.ai** (`fal-ai/idm-vton`)
- **Replicate** (`cuuupid/idm-vton` and others)

These are a one-file engine swap (token-based, returns an image URL). Not wired up
yet — add when you need production reliability.

## Testing an engine directly

```bash
# PowerShell example
$env:HF_TOKEN = "hf_..."          # or GEMINI_API_KEY / FASHN_API_KEY
node scripts/test-tryon.mjs idmvton garment.jpg person.jpg
# → saves tryon-output.<ext> and prints timing / errors
```
