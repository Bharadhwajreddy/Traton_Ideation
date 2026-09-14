/**
 * Copies energy-markets/explainer.html into public/ so the deployed app can serve
 * it at /explainer.html alongside the simulator.
 *
 * The file in energy-markets/ is the SOURCE OF TRUTH — edit it there, then run
 * `npm run sync:explainer` here. The copy is committed (rather than generated at
 * build time) so the deployment never depends on files outside this app's root
 * directory, which Vercel does not include by default in a monorepo.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../../energy-markets/explainer.html");
const dest = resolve(here, "../public/explainer.html");

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}
copyFileSync(src, dest);
console.log(`Copied explainer.html → public/ (${src})`);
