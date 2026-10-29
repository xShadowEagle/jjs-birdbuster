// After a change to the bird, the feather or the Meadow: `npm run bake:art -- --force page`.
import { BIRD_FRAMES, PAGE_IMAGES, SHEETS } from '../../src/assets/manifest.ts';
import { GAME_H, GAME_W, GROUND_Y } from '../../src/constants.ts';
import { UI } from '../../src/ui/colors.ts';
import { BIOMES } from '../../src/world/biomes.ts';
import { drawText, textWidth } from '../../src/ui/font.ts';
import { inEvery } from '../../src/language.ts';
import { pixelsOf } from './lib/assets.ts';
import { mix, type Img, type Pixels, type Px } from './lib/pixels.ts';

const MEADOW = BIOMES.meadow;
const IDLE = BIRD_FRAMES.idle[0];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Px[];
  constructor(w: number, h: number, fill: Px = null) {
    this.w = w;
    this.h = h;
    this.px = new Array<Px>(w * h).fill(fill);
  }

  set(x: number, y: number, c: Px): void {
    if (c !== null && x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }

  blend(x: number, y: number, c: number, alpha: number): void {
    const under = this.px[y * this.w + x];
    if (under !== null && under !== undefined) this.px[y * this.w + x] = mix(under, c, alpha);
  }

  blit(img: Pixels, x: number, y: number, sx = 0, sy = 0, sw = img.w - sx, sh = img.h - sy): this {
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) this.set(x + i, y + j, img.px[(sy + j) * img.w + sx + i] ?? null);
    return this;
  }

  tile(img: Pixels, y: number, shift = 0): this {
    for (let x = -(((shift % img.w) + img.w) % img.w); x < this.w; x += img.w) this.blit(img, x, y);
    return this;
  }

  text(text: string, x: number, y: number, color: number): this {
    // the font draws through a canvas's fillStyle and fillRect: this stands in for one
    const pen = {
      fillStyle: '',
      fillRect: (gx: number, gy: number) => this.set(x + gx, y + gy, parseInt(pen.fillStyle.slice(1), 16)),
    };
    drawText(pen, text, 0, 0, color);
    return this;
  }

  part(x: number, y: number, w: number, h: number): Canvas {
    const out = new Canvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.px[j * w + i] = this.px[(y + j) * this.w + x + i] ?? null;
    return out;
  }

  scaled(k: number): Canvas {
    const out = new Canvas(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = this.px[Math.floor(y / k) * this.w + Math.floor(x / k)];
    return out;
  }
}

function meadow(out: Img[], scroll: number): Canvas {
  const c = new Canvas(GAME_W, GAME_H, MEADOW.sky);
  for (const l of MEADOW.layers) {
    const img = pixelsOf(out, l.key);
    c.tile(img, GAME_H - img.h, Math.round(scroll * l.factor));
  }
  return c.tile(pixelsOf(out, MEADOW.ground), GROUND_Y, scroll);
}

/** As src/ui/scrim.ts draws it. */
function scrim(c: Canvas, top: number, bottom: number, strength: number): void {
  const mid = (top + bottom) / 2, half = (bottom - top) / 2;
  for (let y = Math.max(0, top); y < bottom; y++) {
    const k = 1 - Math.abs(y - mid) / half;
    for (let x = 0; x < c.w; x++) c.blend(x, y, UI.panel, strength * Math.min(1, k * 1.8));
  }
}

/** (x, y): the frame's bottom middle */
function bird(out: Img[], c: Canvas, n: number, x: number, y: number): Canvas {
  const { w, h } = SHEETS['char.bird_solo'];
  return c.blit(pixelsOf(out, 'char.bird_solo'), x - w / 2, y - h, n * w, 0, w, h);
}

/** 1200x630: what chats ask for. */
function preview(out: Img[]): Canvas {
  const K = 10, w = 1200 / K, h = 630 / K;
  const c = meadow(out, 246);
  const x0 = 100, y0 = GROUND_Y + 9 - h;
  scrim(c, y0 - 10, y0 + 40, 0.45);
  const left = x0 + 80 - Math.round(textWidth('BIRDBUSTER') / 2);
  c.text('BIRDBUSTER', left, y0 + 17, UI.gold).text("JJ'S", left + 1, y0 + 7, UI.text);
  const feather = pixelsOf(out, 'item.feather');
  for (const [x, up] of [[62, 13], [84, 17], [106, 13]]) c.blit(feather, x0 + x - 8, GROUND_Y - up - 8);
  bird(out, c, IDLE, x0 + 23, GROUND_Y);
  return c.part(x0, y0, w, h).scaled(K);
}

function icon(out: Img[]): Canvas {
  const SIZE = 40, feet = SIZE - 1;
  const c = new Canvas(SIZE, SIZE, MEADOW.sky);
  c.tile(pixelsOf(out, MEADOW.ground), feet - 4);
  return bird(out, c, IDLE, SIZE / 2 + 1, feet);
}

function rounded(c: Canvas, r: number): Canvas {
  const out = c.part(0, 0, c.w, c.h), n = c.w - 1;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const dx = Math.max(0, r - x, x - (n - r)), dy = Math.max(0, r - y, y - (n - r));
    if (Math.hypot(dx, dy) > r + 0.2) out.px[y * c.w + x] = null;
  }
  return out;
}

/** Baked: the page shows them before the font is there. */
function loadingWords(): Canvas {
  const lines = inEvery('loading'), LINE = 12, w = Math.max(...lines.map(l => textWidth(l))) + 2;
  const c = new Canvas(w, lines.length * LINE);
  lines.forEach((l, i) => c.text(l, 1 + ((w - 2 - textWidth(l)) >> 1), 1 + i * LINE, UI.text));
  return c;
}

/** A phone's home screen icon stays square: phones round it themselves. */
export function makePage(out: Img[]): void {
  const push = (file: string, c: Canvas) => out.push({ file, w: c.w, h: c.h, px: c.px });
  const m = icon(out);
  push(PAGE_IMAGES['page.icon'], rounded(m, Math.round(m.w * 0.18)));
  const SIZE = 180, big = m.scaled(Math.floor(SIZE / m.w)), edge = (SIZE - big.w) / 2;
  const touch = new Canvas(SIZE, SIZE);
  const near = (v: number) => Math.min(big.w - 1, Math.max(0, v - edge));
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) touch.px[y * SIZE + x] = big.px[near(y) * big.w + near(x)];
  push(PAGE_IMAGES['page.touch_icon'], touch);
  push(PAGE_IMAGES['page.preview'], preview(out));
  push(PAGE_IMAGES['page.loading'], loadingWords());
}
