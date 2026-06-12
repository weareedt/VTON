# Virtual Try-On Mini Kiosk — Build Plan

A web-based kiosk where a visitor uploads a garment (baju), picks a try-on engine, takes their photo with the camera, and gets a full-screen result they can save.

---

## 1. Goal & scope

| Item | Decision |
|---|---|
| Format | Web app, runs full-screen on a touchscreen kiosk (tablet/monitor + webcam) |
| Core job | Take a **garment image** + a **person photo** → return a **try-on image** |
| Engines | **FASHN v1.6** and **Nano Banana 2** (Gemini 3.1 Flash Image), user-selectable |
| Audience | Walk-up public visitors (likely retail / event / mall setting) |
| Out of scope (v1) | Accounts, payment, garment catalog, multi-garment outfits, video |

---

## 2. User flow (refined)

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│ 1. Welcome  │ → │ 2. Upload    │ → │ 3. Pick     │ → │ 4. Camera    │ → │ 5. Result   │
│   (idle)    │   │    baju .jpg │   │    engine   │   │    capture   │   │  fullscreen │
└─────────────┘   └──────────────┘   └─────────────┘   └──────────────┘   └─────────────┘
                                                                                 │
                                                          ┌──────────────────────┘
                                                          ▼
                                              Save (download / QR / print) → auto-reset
```

Refinements vs. the original 4 steps:

- **Add an idle/welcome screen.** A kiosk needs an attract loop and a clear "Tap to start."
- **Add a consent line on the camera step** ("We use your photo only to generate the try-on and don't store it"). Important for Malaysia's PDPA.
- **Add a loading screen.** Try-on takes ~7–20s; show progress + the uploaded garment so the wait feels intentional.
- **Auto-reset.** After save or 60s idle, wipe images and return to welcome so the next person starts clean.

---

## 3. Architecture

```
   Kiosk browser (frontend)                 Your backend (required)            Model providers
 ┌───────────────────────────┐           ┌──────────────────────────┐       ┌──────────────────┐
 │ - Garment upload          │  HTTPS    │ - Holds API keys (secret)│  API  │ FASHN  /v1/run   │
 │ - Engine toggle           │ ────────► │ - Routes to chosen model │ ────► │ tryon-v1.6       │
 │ - getUserMedia camera     │           │ - Polls FASHN job        │       ├──────────────────┤
 │ - Loading + result UI     │ ◄──────── │ - Normalizes the output  │ ◄──── │ Gemini 3.1 Flash │
 │ - Save / QR / reset       │  result   │ - Cleans up temp images  │       │ Image (NB2)      │
 └───────────────────────────┘           └──────────────────────────┘       └──────────────────┘
```

**Why a backend is non-negotiable:** API keys must never ship in browser code, and FASHN is an async submit-then-poll API that a kiosk shouldn't manage client-side. The backend is a thin proxy.

---

## 4. Engine comparison & recommendation

| | **FASHN v1.6** | **Nano Banana 2 (Gemini 3.1 Flash Image)** |
|---|---|---|
| Built for | Purpose-built virtual try-on | General image generation/editing |
| Garment fidelity | High — preserves patterns, text, logos accurately | Good, but it "reinterprets"; less deterministic on fine garment detail |
| Output | 864×1296 fixed | Up to 4K, flexible aspect |
| Speed | ~7s (Performance) up to ~15s (Quality) | Flash-speed, but varies by load |
| Control | model_image + garment_image, simple | Prompt-driven; needs prompt engineering for try-on |
| Privacy | `return_base64` = output not stored on their servers | SynthID watermark embedded in all outputs |
| Price (approx) | ~$0.075 / generation | Token/credit based; verify current Gemini API pricing |
| Access | api.fashn.ai direct, or via fal.ai | Gemini API (Google AI Studio) or Vertex AI |
| Best when | You want a true, accurate clothing swap | You want creative styling / scene control / a flexible fallback |

**Recommendation:** Make **FASHN v1.6 the default** path (it's the right tool for an accurate baju try-on) and offer **Nano Banana 2 as the alternative** for creative/stylized results. Build both behind one backend interface so the frontend just sends `{engine, garment, person}` and doesn't care about the differences.

> Note: Nano Banana 2 is not a dedicated try-on model. To get a try-on, you pass both the person and the garment as reference images plus an instruction prompt ("dress the person in the uploaded garment, keep their face and pose"). Expect to tune the prompt. SynthID watermarking applies to every output.

---

## 5. Recommended tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) or plain HTML/JS | Single-page, full-screen, kiosk-locked |
| Camera | `navigator.mediaDevices.getUserMedia` → `<canvas>` → JPEG | Capture a still, not a stream |
| Backend | Node + Express, or serverless functions | Holds keys, proxies + polls |
| Hosting | Any (Vercel/Render/VPS); kiosk needs reliable network | Consider a local fallback message if offline |
| Kiosk shell | Chrome kiosk mode / fullscreen API | Disable navigation, right-click, pinch-zoom |

---

## 6. Frontend components

1. **Idle / welcome** — looping demo + "Tap to start."
2. **Garment upload** — `<input type="file" accept="image/jpeg">`; show a preview; validate it's a real JPEG and under a size cap (e.g. 10 MB). Optionally allow a small built-in garment library too.
3. **Engine selector** — two big touch cards: "Accurate (FASHN)" vs "Creative (Nano Banana 2)." Plain-language labels, not brand jargon.
4. **Camera capture** — live preview with a body-framing outline overlay, a 3-2-1 countdown, capture button, and a retake option. Save the frame as JPEG.
5. **Loading** — show garment thumbnail + animated progress; backend drives real status where possible.
6. **Result (full screen)** — the generated image edge-to-edge, with: **Save**, **Start over**, and ideally a **QR code** to grab it on a phone.
7. **Auto-reset timer** — clears state and returns to idle.

---

## 7. Backend API integration

### Shared internal endpoint
```
POST /api/tryon
body: { engine: "fashn" | "nanobanana", garmentImage: <base64/jpeg>, personImage: <base64/jpeg> }
→ returns: { imageUrl | imageBase64 }
```

### FASHN v1.6 path
- Submit: `POST https://api.fashn.ai/v1/run`
  - Header: `Authorization: Bearer <FASHN_API_KEY>`
  - Body: `{ "model_name": "tryon-v1.6", "inputs": { "model_image": <person>, "garment_image": <garment>, "output_format": "jpeg", "return_base64": true } }`
  - `model_image` = the visitor's photo; `garment_image` = the baju.
  - Use `output_format: "jpeg"` for speed (better for real-time kiosk), `return_base64: true` so outputs aren't stored on FASHN's servers.
- Poll: submit returns a prediction `id`; poll the status endpoint until `status: "completed"`, then read `output`.
- Pick a mode (Performance / Balanced / Quality). Start with **Performance** for kiosk speed.

### Nano Banana 2 path
- Model string: `gemini-3.1-flash-image` (via Gemini API / Google AI Studio, or Vertex AI).
- Send a multi-image request: person image + garment image + an instruction prompt that asks the model to dress the person in the garment while preserving their face, pose, and body.
- Returns image bytes directly (no polling). Remember every output carries a **SynthID** watermark.
- Budget time to **prompt-engineer** this path — it's the main effort difference vs FASHN.

> Confirm both providers' **current pricing and rate limits** before launch — they change. FASHN is also available through fal.ai (`fal-ai/fashn/tryon/v1.6`) if you'd rather use one aggregator/SDK for both.

---

## 8. Image quality tips (affects results more than anything)

- **Person photo:** well-lit, front-facing, upper/full body in frame, plain-ish background. The framing overlay on the camera step is the single highest-leverage UI element.
- **Garment image:** flat-lay or on-model both work for FASHN; a clean, cropped garment on a plain background gives the best swap.
- Downscale/compress on the client before upload to cut latency.
- Resolution: FASHN outputs 864×1296 — design the result screen around a tall portrait aspect.

---

## 9. Privacy & consent (Malaysia PDPA)

- Show a short consent notice before the camera turns on; require a tap to proceed.
- **Don't persist faces.** Use FASHN `return_base64` and don't write user images to disk; for Nano Banana, don't log the inputs. Hold images in memory only for the request, then drop them.
- Result images: keep only as long as needed to show/QR-download, then purge (e.g. expire after a few minutes).
- Put a plain-language privacy line on the kiosk and a contact for questions.

---

## 10. Kiosk-specific considerations

- **Full-screen lock:** Chrome kiosk mode; disable address bar, back/forward, context menu, text selection, and pinch-zoom.
- **Auto-recovery:** if the app crashes or network drops, show a friendly "Be right back" and reload.
- **Reset hygiene:** clear all state between sessions; no previous visitor's photo should ever leak into the next session.
- **Save options for a shared device:** downloading to "the kiosk" is useless to the visitor — prefer **QR code** (scan to download on their phone), optional **print**, or optional **email**. Keep a plain Save/download too if a personal device is being used.
- **Touch ergonomics:** big targets, minimal typing, generous spacing.

---

## 11. Rough cost model

- Per FASHN try-on ≈ $0.075. At 200 generations/day ≈ **$15/day** just for FASHN inference.
- Nano Banana 2 billed by Gemini API usage — verify current rate; factor it separately.
- Add hosting (low), and a contingency for retries (a visitor who retakes their photo triggers another paid generation — consider limiting retakes).

---

## 12. Build phases

| Phase | Deliverable |
|---|---|
| 0. Spike | Backend hits FASHN v1.6 with two test images, returns a result. Prove the core works. |
| 1. Backend | `/api/tryon` with both engines behind one interface; polling + cleanup for FASHN; prompt tuned for NB2. |
| 2. Frontend flow | Welcome → upload → engine pick → camera capture → loading → result, wired to backend. |
| 3. Kiosk hardening | Full-screen lock, auto-reset, consent screen, error/offline states. |
| 4. Save & polish | QR/print/save, framing overlay, attract loop, branding. |
| 5. Pilot | Run on real hardware, tune image guidance and prompts from real visitor photos. |

---

## 13. Open decisions (need answers before/early in build)

1. **Save method:** QR download, print, email, or all of the above?
2. **Hardware:** which tablet/monitor + webcam, and is network reliable at the venue?
3. **Retake limit:** how many free retakes before it counts as a new paid generation?
4. **Garment source:** upload only, or also a small built-in baju library?
5. **NB2 default behavior:** is it a co-equal option or just a "creative mode" toggle?
6. **Branding/language:** English only, or BM + English?

---

## 14. Key risks

- **API keys leaking** → mitigated by the backend proxy (never call providers from the browser).
- **Bad input photos** → mitigated by the camera framing overlay + lighting guidance.
- **Latency frustration** → use FASHN Performance mode + JPEG output + a good loading screen.
- **Privacy/PDPA** → no persistence, clear consent, auto-purge.
- **Provider pricing/limits change** → confirm at launch and monitor; the fal.ai route is a backup for FASHN.
