// Engine registry. The frontend sends an `engine` string; the route looks it up
// here and calls run({ garment, person }). One place to add/swap engines.
import * as fashn from './fashn.js';
import * as nanobanana from './nanobanana.js';

export const engines = {
  fashn, // "Accurate" — real FASHN v1.6
  nanobanana, // "Creative" — placeholder until Gemini is wired
};

export function getEngine(name) {
  return engines[name] || null;
}

export { EngineConfigError } from './fashn.js';
