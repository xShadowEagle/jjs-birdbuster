// PNGs (or parts of them) scaled up side by side on a grey checker, written to one PNG. Paths are
// tried as given, then under public/assets/. `path#n` is frame n of a sheet (its frame size from the
// manifest, or from a draft's @WxH name); `path:x,y,w,h` any rectangle; `--row` starts a new row.
//   npm run art:sheet -- [--out tmp/sheet.png] [--scale 6] ui/heart.png workbench/drafts/a/ui/heart.png --row characters/bird.png#10
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePng, pngPixels } from './lib/png.ts';
import { mix, opacity, type Pixels } from './lib/pixels.ts';
import { assetFileOf, draftFrame } from './lib/drafts.ts';
import { SHEETS } from '../../src/assets/manifest.ts';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args.splice(i, 2)[1];
};
const out = opt('--out', 'tmp/sheet.png'), K = Number(opt('--scale', '6'));

interface Cell { img: Pixels; x: number; y: number; w: number; h: number }
const rows: Cell[][] = [[]];
for (const arg of args) {
  if (arg === '--row') { rows.push([]); continue; }
  const [, given, frame, rect] = /^(.*?)(?:#(\d+)|:(\d+,\d+,\d+,\d+))?$/.exec(arg)!;
  const path = given.replace(/\\/g, '/');
  const file = existsSync(path) ? path : `public/assets/${path}`;
  if (!existsSync(file)) throw new Error(`no such image: ${given}`);
  const img = pngPixels(readFileSync(file));
  let [x, y, w, h] = rect ? rect.split(',').map(Number) : [0, 0, img.w, img.h];
  if (frame !== undefined) {
    const sheet = Object.values(SHEETS).find(s => s.file === assetFileOf(file));
    ({ w, h } = draftFrame(file) ?? sheet ?? img);
    const cols = Math.max(1, Math.floor(img.w / w)), n = Number(frame);
    [x, y] = [(n % cols) * w, Math.floor(n / cols) * h];
  }
  if (x < 0 || y < 0 || x + w > img.w || y + h > img.h) throw new Error(`${arg} reaches outside ${given} (${img.w}x${img.h})`);
  rows.at(-1)!.push({ img, x, y, w, h });
}

const GAP = 2 * K;
const W = Math.max(...rows.map(r => r.reduce((n, c) => n + c.w * K + GAP, GAP)));
const rowH = rows.map(r => Math.max(0, ...r.map(c => c.h * K)));
const H = rowH.reduce((n, h) => n + h + GAP, GAP);
const px: number[] = new Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px[y * W + x] = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 0x5a5a62 : 0x4a4a52;
let oy = GAP;
rows.forEach((r, ri) => {
  let ox = GAP;
  for (const { img, x, y, w, h } of r) {
    for (let j = 0; j < h * K; j++) for (let i = 0; i < w * K; i++) {
      const c = img.px[(y + Math.floor(j / K)) * img.w + x + Math.floor(i / K)], d = (oy + j) * W + ox + i;
      if (c !== null) px[d] = mix(px[d], c, opacity(c) / 255);
    }
    ox += w * K + GAP;
  }
  oy += rowH[ri] + GAP;
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePng({ w: W, h: H, px }));
console.log(`${out}  ${W}x${H}`);
