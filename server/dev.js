// Local dev/runtime server. Mirrors the Vercel setup on one origin: serves the
// built client (client/dist) and mounts the same serverless function handlers at
// /api. Use this to run the real kiosk locally without the Vercel CLI.
//
//   npm run kiosk      → build client, then start here
//   open http://localhost:3000
//
// (For production, Vercel runs the same handlers; this file is dev-only.)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import health from '../api/health.js';
import tryon from '../api/tryon.js';
import resultHandler from '../api/result/[token].js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../client/dist');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '15mb' }));

// API — the same handlers Vercel runs as functions.
app.get('/api/health', health);
app.post('/api/tryon', tryon);
// Vercel passes the dynamic segment as req.query.token; Express uses req.params.
app.get('/api/result/:token', (req, res) => {
  req.query = { ...req.query, token: req.params.token };
  return resultHandler(req, res);
});

// Static client + SPA fallback.
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  Kiosk running →  http://localhost:${PORT}\n`);
  if (!process.env.HF_TOKEN) {
    console.log('  (HF_TOKEN not set — the Accurate engine may hit GPU quota. Set it for reliability.)\n');
  }
});
