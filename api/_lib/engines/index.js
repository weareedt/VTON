// Engine registry. The frontend sends an `engine` string; the route looks it up
// here and calls run({ garment, person }). One place to add/swap engines.
import * as idmvton from './idmvton.js';
import * as fashn from './fashn.js';
import * as nanobanana from './nanobanana.js';

export const engines = {
  idmvton, // "Accurate" — free IDM-VTON via Hugging Face Space (default)
  fashn, // paid FASHN v1.6 — kept for production; needs FASHN_API_KEY
  nanobanana, // "Creative" — placeholder until Gemini is wired
};

export function getEngine(name) {
  return engines[name] || null;
}

export { EngineConfigError } from '../errors.js';
