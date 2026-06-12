# EDT Virtual Try-On Kiosk

A web-based virtual try-on kiosk by **[EDT — Experiential Design Team](https://weareedt.com)**.
A visitor picks a garment, chooses a try-on engine, takes their photo with the
camera, and gets a full-screen result they can save (download or QR-to-phone).

Built for full-screen touchscreen kiosks (tablet/monitor + webcam), with API keys
kept safely on a thin serverless backend.

> Original product brief and rationale: see [PLAN.md](PLAN.md).

---

## Features

- **Full kiosk flow:** Welcome → choose garment → pick engine → camera capture → loading → full-screen result.
- **Two try-on engines** behind one interface (the frontend just sends `{ engine, garment, person }`):
  - **Nano Banana** — Google Gemini Flash Image. Accurate, realistic results; fast.
  - **IDM-VTON** — experimental clothing swap. Free via a Hugging Face Space.
- **Garment library** — pre-stored garments you can add/swap **without a rebuild** (drop a file in a folder, refresh).
- **Camera niceties** — portrait 3:4 framing overlay, 3-2-1 countdown, retake, automatic exposure correction, and EXIF auto-rotation for uploads.
- **Kiosk hygiene** — 60s idle auto-reset that wipes all images; images held in memory only (no disk persistence), per Malaysia PDPA.
- **Save options** — direct download + optional QR code (scan to grab on your phone).
- **EDT brand** — Electric Blue on black, Dela Gothic One + Space Grotesk, sharp corners.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite (single-page, full-screen) |
| Backend | Vercel Serverless Functions (`/api`) — thin proxy that holds API keys |
| Hosting | Vercel (static client + functions, HTTPS for the camera) |
| Local dev | A small Express server that mirrors the Vercel setup on one origin |
| Optional store | Upstash Redis (short-lived result for the QR download) |

---

## Quick start (local)

Requirements: **Node 18+**.

```bash
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Provide keys (copy the example, fill in what you need)
cp .env.example .env        # then edit .env

# 3. Build the client and run the kiosk on one origin
npm run kiosk               # http://localhost:3000
```

Then open **http://localhost:3000** and walk the flow. The camera works on
`localhost` (a secure context).

> **PowerShell users:** set env vars in the shell before running, e.g.
> `$env:HF_TOKEN = "hf_..."`, `$env:GEMINI_API_KEY = "AIza..."`, then `npm run kiosk`.

### Scripts

| Command | What it does |
|---|---|
| `npm run kiosk` | Build the client, then start the local server (use after code changes) |
| `npm run serve` | Start the local server only (use when you only changed garments) |
| `npm run dev` / `start` | `vercel dev` (requires the Vercel CLI + login) |
| `npm run build` | Build the client to `client/dist` (what Vercel runs) |

There are also helper scripts in [`scripts/`](scripts/):

- `node scripts/test-tryon.mjs <engine> <garment.jpg> <person.jpg>` — run an engine directly and save the result, no UI needed.
- `./scripts/fix-rotation.ps1 <file>` — bake EXIF rotation into a sideways phone photo (Windows).

---

## Environment variables

Set these in `.env` for local dev, or in the **Vercel dashboard** for production.
None are committed to git. See [`.env.example`](.env.example).

| Variable | Required for | Notes |
|---|---|---|
| `HF_TOKEN` | IDM-VTON engine | Free Hugging Face read token. Without it, anonymous calls hit GPU quota fast. |
| `GEMINI_API_KEY` | Nano Banana engine | Free key from [Google AI Studio](https://aistudio.google.com). Image generation may require billing enabled on the project. |
| `GEMINI_MODEL` | *(optional)* | Defaults to `gemini-2.5-flash-image`. Set to `gemini-3.1-flash-image` for the paid "Nano Banana 2" (better quality). |
| `NANOBANANA_PROMPT` | *(optional)* | Override the built-in try-on instruction without a code change. |
| `FASHN_API_KEY` | FASHN engine *(optional)* | Only if you use the FASHN engine. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | QR save *(optional)* | From an Upstash Redis store. Without them, QR is skipped (download still works). |

A missing key makes only **that** engine return a graceful error — the rest of the kiosk keeps working.

---

## Deployment

Deployed on **Vercel** from this GitHub repo. The short version:

1. Import the repo at [vercel.com](https://vercel.com) (build settings come from `vercel.json`).
2. Add environment variables (table above) in **Settings → Environment Variables**.
3. Redeploy. Share the `*.vercel.app` URL.

Full guide, including the function-timeout caveat for IDM-VTON: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## The garment library

Pre-stored garments live in [`client/public/garments/`](client/public/garments/).

- **Add a garment:** drop a `.jpg`/`.png`/`.webp` in that folder. The filename
  becomes the label (`batik-shirt.jpg` → "batik shirt").
- On a **local kiosk**, just refresh — no rebuild needed (the server lists the
  folder live at `/api/garments`).
- On **Vercel**, commit the new images and push (Vercel redeploys).
- Best results: **upper-body garments only** (IDM-VTON doesn't do pants/skirts),
  front-view product shots on a plain background, upright.

---

## Project structure

```
VTON/
├── api/                      # Vercel serverless functions
│   ├── health.js             #   GET  /api/health
│   ├── tryon.js              #   POST /api/tryon  → engine router
│   ├── garments.js           #   GET  /api/garments  → library listing
│   ├── result/[token].js     #   GET  /api/result/:token  → QR image
│   └── _lib/
│       ├── engines/          #   idmvton.js · nanobanana.js · fashn.js · index.js
│       ├── kv.js             #   Upstash Redis helpers (QR store)
│       ├── images.js         #   base64/data-url helpers
│       └── errors.js         #   shared EngineConfigError
├── client/                   # React + Vite frontend
│   ├── public/
│   │   ├── garments/         #   pre-stored garment library
│   │   ├── brand/            #   EDT logos
│   │   └── favicon/          #   favicon kit + PWA manifest
│   └── src/
│       ├── App.jsx           #   screen state machine + idle reset
│       ├── api.js            #   postTryOn()
│       ├── imageUtils.js     #   downscale, EXIF rotate, exposure correct
│       ├── screens/          #   Welcome · GarmentSelect · EngineSelect · Camera · Loading · Result
│       └── styles/kiosk.css  #   EDT-branded styles
├── server/dev.js             # local server (mirrors Vercel on one origin)
├── scripts/                  # test-tryon.mjs · fix-rotation.ps1
├── vercel.json               # build + function config + SPA rewrites
└── PLAN.md                   # product brief
```

---

## Architecture

```
 Kiosk browser (frontend)            Serverless backend (/api)          Model providers
 ┌────────────────────────┐  POST   ┌──────────────────────────┐  API  ┌──────────────┐
 │ garment + engine + cam │ ──────► │ /api/tryon engine router │ ────► │ IDM-VTON (HF)│
 │ loading + result + QR  │ ◄────── │ holds keys, normalizes   │ ◄──── │ Gemini / FASHN│
 └────────────────────────┘ result  └──────────────────────────┘       └──────────────┘
```

API keys never reach the browser. Input images are held only for the request;
nothing is written to disk. Only the generated result is briefly cached (Upstash
Redis, short TTL) to back the QR download.

---

## Privacy (Malaysia PDPA)

- A consent line is shown before the camera step.
- Input photos are processed in memory and dropped after the request — never persisted or logged.
- The QR result is stored briefly with a short TTL, then auto-purged. It holds only the generated result, never the input face photo.

---

## Documentation

- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Vercel deploy, env vars, timeout caveats.
- **[docs/ENGINES.md](docs/ENGINES.md)** — engines, costs, how to add/swap one.
- **[PLAN.md](PLAN.md)** — original product brief.

---

*Built by EDT — Experiential Design Team (Adticles Sdn Bhd) · weareedt.com*
