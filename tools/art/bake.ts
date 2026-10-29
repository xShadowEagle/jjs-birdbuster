// Bakes the generated art into PNGs under public/assets/.
//   npm run bake:art              write files that don't exist yet (never overwrites)
//   npm run bake:art -- --force   overwrite everything the generators produce
//   npm run bake:art -- bird      only files whose path contains "bird" (combine with --force)
//   npm run bake:art -- --out workbench/drafts/fluffy bird
//                                 write into a workbench draft set instead (always overwrites)
// Once a PNG is hand-drawn, delete its generator: --force would overwrite it.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Img } from './lib/pixels.ts';
import { encodePng } from './lib/png.ts';
import { makeBird } from './bird.ts';
import { makeCast } from './cast.ts';
import { makeEnemies } from './enemies.ts';
import { makeProps } from './props.ts';
import { makeFx, makeHudIcons, makeItems } from './sprites.ts';
import { makeBiomes } from './biomes.ts';
import { makeButtonIcons } from './buttons.ts';
import { makePage } from './page.ts';

const args = process.argv.slice(2);
const out = args.indexOf('--out');
const outDir = out >= 0 ? args[out + 1]?.replace(/\/?$/, '/') : undefined;
if (out >= 0 && !outDir) throw new Error('--out needs a folder, e.g. --out workbench/drafts/fluffy');
const OUT_DIR = outDir ?? 'public/assets/';
const force = args.includes('--force') || !!outDir;
const filters = args.filter((a, i) => !a.startsWith('--') && (out < 0 || i !== out + 1))
  .map(f => f.replace(/\\/g, '/'));

const images: Img[] = [];
for (const make of [makeBird, makeCast, makeEnemies, makeProps, makeItems, makeFx, makeHudIcons, makeButtonIcons, makeBiomes]) make(images);
// last: put together from the pictures above
makePage(images);

let written = 0, skipped = 0;
for (const img of images) {
  if (filters.length && !filters.some(f => img.file.includes(f))) continue;
  const path = OUT_DIR + img.file;
  if (existsSync(path) && !force) { skipped++; continue; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(img));
  console.log(`  ${img.file.padEnd(34)} ${img.w}x${img.h}`);
  written++;
}
console.log(`${written} written, ${skipped} kept (already exist${force ? '' : '; --force to overwrite'})`);
