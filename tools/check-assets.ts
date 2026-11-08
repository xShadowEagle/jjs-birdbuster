// Checks the asset manifest against public/assets.
// Run: npm run check:assets
import { existsSync, readFileSync } from 'node:fs';
import { pngSize } from './art/lib/png.ts';
import { filesUnder } from './files.ts';
import { ANIMS, IMAGES, MUSIC, PAGE_IMAGES, SHEETS } from '../src/assets/manifest.ts';

const DIR = 'public/assets/';
const errors: string[] = [];

const listed = new Set<string>();
const need = (file: string, what: string): boolean => {
  listed.add(file);
  if (existsSync(DIR + file)) return true;
  errors.push(`missing ${DIR}${file} (${what})`);
  return false;
};

for (const [key, file] of Object.entries(IMAGES)) need(file, `image '${key}'`);
const html = readFileSync('index.html', 'utf8'), readme = readFileSync('README.md', 'utf8');
for (const [key, file] of Object.entries(PAGE_IMAGES)) {
  need(file, `page image '${key}'`);
  if (file.startsWith('page/') && !html.includes(`/assets/${file}"`) && !readme.includes(`assets/${file}`)) errors.push(`neither index.html nor README.md names assets/${file} (page image '${key}')`);
}
const frames: Record<string, number> = {};
for (const [key, s] of Object.entries(SHEETS)) {
  if (!need(s.file, `sheet '${key}'`)) continue;
  const [w, h] = pngSize(readFileSync(DIR + s.file));
  if (w % s.w || h !== s.h) errors.push(`sheet '${key}' is ${w}x${h}, not whole ${s.w}x${s.h} frames in one row`);
  frames[key] = Math.floor(w / s.w);
}
for (const [key, a] of Object.entries(ANIMS)) {
  const bad = a.frames.filter(f => f >= (frames[a.sheet] ?? Infinity));
  if (bad.length) errors.push(`anim '${key}' uses frame ${bad.join(', ')} but '${a.sheet}' has ${frames[a.sheet]}`);
}
for (const track of new Set(Object.values(MUSIC))) for (const ext of ['ogg', 'mp3']) need(`music/${track}.${ext}`, `music '${track}'`);

const unlisted = filesUnder(DIR)
  .filter(f => /\.[a-z0-9]+$/i.test(f) && !listed.has(f));
for (const f of unlisted) errors.push(`unlisted ${DIR}${f} (add it to src/assets/manifest.ts, or delete it)`);

console.log(`${listed.size} files listed, ${Object.keys(ANIMS).length} animations`);
for (const e of errors) console.log(`   ✗ ${e}`);
process.exit(errors.length ? 1 : 0);
