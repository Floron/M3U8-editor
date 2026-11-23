/**
 * Generates `public/icons-manifest.json` from the files in
 * `public/epgone_dark_logo`. Run with: npm run generate-icons
 */
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconDir = path.resolve(__dirname, '..', 'public', 'epgone_dark_logo');
const outPath = path.resolve(iconDir, '..', 'icons-manifest.json');

const files = readdirSync(iconDir).filter((f) => f.toLowerCase().endsWith('.png'));

/** @type {Record<string, string>} */
const manifest = {};

for (const file of files) {
  const base = file.slice(0, -4); // strip .png
  const lower = base.toLowerCase();
  if (!(lower in manifest)) manifest[lower] = file;

  const normalized = lower.replace(/ /g, '_');
  if (!(normalized in manifest)) manifest[normalized] = file;
}

writeFileSync(outPath, JSON.stringify(manifest));
console.log(`icons-manifest.json: ${files.length} files, ${Object.keys(manifest).length} keys`);
