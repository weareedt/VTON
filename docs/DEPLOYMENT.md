# Deployment (Vercel)

The kiosk deploys to **Vercel** from this GitHub repo: a static Vite client plus
serverless functions under `/api`. Build settings are read from
[`vercel.json`](../vercel.json), so you don't configure them by hand.

## First deploy

1. Push your code to GitHub (Vercel only deploys what's pushed).
2. Go to [vercel.com](https://vercel.com) → **Sign in with GitHub**.
3. **Add New → Project** → import this repo.
4. Leave the framework preset as **Other** (settings come from `vercel.json`).
5. Add **Environment Variables** (see below) → **Deploy**.
6. After ~1–2 min you get a public `*.vercel.app` URL. The camera works because
   Vercel serves over HTTPS.

## Environment variables

Add these in **Project → Settings → Environment Variables**. The **Key** is the
variable *name*; the **Value** is the secret.

| Key | Value | Enables |
|---|---|---|
| `HF_TOKEN` | Hugging Face read token | IDM-VTON (Accurate) engine |
| `GEMINI_API_KEY` | Google AI Studio key | Nano Banana (Creative) engine |
| `GEMINI_MODEL` | *(optional)* `gemini-3.1-flash-image` | Paid "Nano Banana 2" (better quality) |
| `NANOBANANA_PROMPT` | *(optional)* custom prompt | Tune the try-on instruction |
| `FASHN_API_KEY` | *(optional)* FASHN key | If you switch Accurate → FASHN |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | *(optional)* Upstash Redis | QR "save to phone" |

> ⚠️ **Env vars only apply to deployments made *after* you save them.** After
> adding or changing a variable, trigger a redeploy:
> **Deployments → ⋯ on the latest → Redeploy.**

## Updating the deployment

Every push to `main` auto-redeploys. To redeploy without a code change (e.g. after
changing an env var), use **Deployments → ⋯ → Redeploy**.

## Caveats & gotchas

### IDM-VTON can time out on the free plan
IDM-VTON runs on a shared free Hugging Face Space and takes **~30–50s**. Vercel's
**Hobby (free)** plan caps function execution (commonly ~10s, up to 60s on newer
runtimes). `vercel.json` sets `maxDuration: 60` on `/api/tryon`, which needs the
**Pro plan** to take full effect. If IDM-VTON times out on your plan:

- Use **Nano Banana** for the deployed demo (it's fast — a few seconds), or
- Move IDM-VTON to a paid host (fal.ai / Replicate) — see [ENGINES.md](ENGINES.md).

### Nano Banana needs image-gen quota
Gemini image generation often returns **"exceeded quota"** on a pure free key
until **billing is enabled** on the Google Cloud project (new accounts get $300
credit). Enabling billing fixes it without changing the key.

### Garment library on Vercel
Vercel hosting is immutable per deploy, so adding garments in production means
**committing the images and pushing** (Vercel redeploys). The "no rebuild" workflow
only applies to a locally-run kiosk. To change garments without redeploying, move
them to external storage (e.g. Vercel Blob) — not currently wired up.

### Secrets
Never commit keys. `.env`, `*.txt`, and token-shaped files are git-ignored. GitHub
push protection will block a push that contains a detected secret.

## Running locally without Vercel CLI

`npm run dev` uses `vercel dev` (requires the CLI + login). For a no-login local
run that mirrors production on one origin:

```bash
npm run kiosk      # build client + start server → http://localhost:3000
```

See [server/dev.js](../server/dev.js).
