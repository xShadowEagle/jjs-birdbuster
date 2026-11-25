// After a change to the bird, the feather or the Meadow: `npm run bake:art -- --force page`.
import { BIRD_FRAMES, PAGE_IMAGES, SHEETS } from '../../src/assets/manifest.ts';
import { GAME_H, GAME_W, GROUND_Y } from '../../src/constants.ts';
import { UI } from '../../src/ui/colors.ts';
import { BIOMES } from '../../src/world/biomes.ts';
import { drawText, textWidth } from '../../src/ui/font.ts';
import { LANGUAGES, TEXTS, inEvery } from '../../src/language.ts';
import { NAP, NAPPING, NEST_RIM, boboStrip, type Frame as BirdFrame, type P } from './bird.ts';
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

/** 1200x632: what chats ask for. WhatsApp shows only its middle square, which holds the title and Bobo. */
function preview(out: Img[]): Canvas {
  const K = 8, w = 150, h = 79;
  const c = meadow(out, 246);
  const x0 = 100, y0 = GROUND_Y + 9 - h, mid = x0 + w / 2;
  scrim(c, y0 - 3, y0 + 39, 0.45);
  const left = mid - Math.round(textWidth('BIRDBUSTER') / 2);
  c.text('BIRDBUSTER', left, y0 + 19, UI.gold).text("JJ'S", left + 1, y0 + 9, UI.text);
  const feather = pixelsOf(out, 'item.feather');
  for (const [x, up] of [[-29, 24], [29, 13]]) c.blit(feather, mid + x - 8, GROUND_Y - up - 8);
  bird(out, c, IDLE, mid + 1, GROUND_Y);                  // +1: tail to beak centred
  return c.part(x0, y0, w, h).scaled(K);
}

/** 1200x630: the README's picture. */
function banner(out: Img[]): Canvas {
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

/** The z's: [x, y, size, first frame, last frame]. */
const ZS: [number, number, number, number, number][] = [[34, 11, 4, 1, 5], [39, 5, 5, 2, 6], [45, 0, 6, 3, 7]];
const zGlyph = (n: number) => Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => y === 0 || y === n - 1 || x === n - 2 - (y - 1) ? '#' : '.').join(''));

/** The asleep screen's frames: 72x44, the bird's 40 px frame at (LEFT, TOP). */
const W = 72, H = 44, TOP = H - 40;
const LEFT = 20;                                           // the nest (x 0 to 30 in the bird's frame) in the middle, under the words

const BANG = ['##', '##', '##', '##', '##', '##', '..', '##', '##'];
const ASK = ['.###.', '##.##', '...##', '..##.', '..##.', '.....', '..##.'];
const POP = ['#..#..#', '.#...#.', '.......', '##...##', '.......', '.#...#.', '#..#..#'];
const POPPED = ['#...#', '.....', '.....', '.....', '#...#'];
type Mark = [rows: string[], x: number, y: number, color: number];
const bang: Mark = [BANG, 55, 1, UI.gold];
const ask: Mark = [ASK, 56, 2, UI.text];
/** Over his back: where the poke lands. */
const pop: Mark = [POP, 26, 9, UI.text];
const popped: Mark = [POPPED, 27, 10, UI.dim];

/** Short: standing in the nest, his toes stay in it. */
const IN_NEST: BirdFrame['legs'] = [{ heel: [-2, 4], ankle: [0.5, 7.5], planted: true }, { heel: [-2.5, 4], ankle: [-0.5, 7.5], planted: true }];
/** The cap lying beside the nest. */
const CAP_DOWN: P = [-3, 43.3];
const nap = (f: Partial<BirdFrame> = {}): BirdFrame => ({ ...NAP, ...f });
const stand = (f: Partial<BirdFrame> = {}): BirdFrame => ({ pose: 'idle', bob: 0, phase: 0, nest: NEST_RIM, empty: true, legs: IN_NEST, ...f });
const aloft = (pose: 'jump' | 'glide', bob: number, phase: number, f: Partial<BirdFrame> = {}): BirdFrame => ({ pose, bob, phase, nest: NEST_RIM, empty: true, crest: 'up', ...f });

/** A frame of Bobo and the marks drawn over it. */
interface Beat { bird: BirdFrame; marks?: Mark[] }

/** Pokes one to four: a hop in the nest, higher each time. */
const POKED: Beat[][] = [
  [{ bird: nap({ bob: -3, squint: true }), marks: [pop] }, { bird: nap({ bob: -2.5, squint: true }), marks: [popped] }, { bird: nap({ puff: 0.8 }) }, { bird: nap() }],
  [{ bird: nap({ bob: -4, squint: true }), marks: [pop] }, { bird: nap({ bob: -3, squint: true }), marks: [popped] }, { bird: nap({ puff: 0.9 }) }, { bird: nap() }],
  [{ bird: nap({ bob: -5, eyes: 'open' }), marks: [pop] }, { bird: nap({ bob: -3.5, eyes: 'open' }), marks: [popped] }, { bird: nap({ bob: -2.5 }) }, { bird: nap() }],
  [{ bird: nap({ bob: -6, eyes: 'open', puff: 1 }), marks: [pop] }, { bird: nap({ bob: -4, eyes: 'open' }), marks: [popped, ask] }, { bird: nap({ eyes: 'open' }), marks: [ask] }, { bird: nap({ eyes: 'shut' }) }],
];

/** The fifth: he jumps out flapping, the cap tumbles down beside the nest, and he lands. */
const WAKING: Beat[] = [
  { bird: nap({ eyes: 'open' }), marks: [bang] },
  { bird: nap({ eyes: 'open', puff: 1.4 }), marks: [bang] },
  { bird: nap({ eyes: 'open', puff: 1.2, head: [1, -1], cap: [27.5, 14] }) },
  { bird: aloft('jump', -3, 1, { cap: [21, 7] }) },
  { bird: aloft('jump', -6, 2, { cap: [13, 5] }) },
  { bird: aloft('glide', -7, 0, { cap: [6, 10] }) },
  { bird: aloft('glide', -5, 1, { cap: [1, 20] }) },
  { bird: aloft('jump', -2, 1, { crest: 'swept', cap: [-2, 32] }) },
  { bird: stand({ cap: CAP_DOWN }) },
  { bird: stand({ open: true, crest: 'up', cap: CAP_DOWN }) },
  { bird: stand({ open: true, crest: 'up', cap: CAP_DOWN }) },
  { bird: stand({ cap: CAP_DOWN }) },
];

const glyph = (c: Canvas, rows: string[], x: number, y: number, color: number) =>
  rows.forEach((row, gy) => [...row].forEach((ch, gx) => { if (ch === '#') c.set(x + gx, y + gy, color); }));

/** A row of frames, from (0, y). */
function beats(c: Canvas, row: Beat[], y: number): Canvas {
  c.blit(boboStrip(`page frames at ${y}`, row.map(b => b.bird), W, H, LEFT, TOP), 0, y);
  row.forEach((b, i) => b.marks?.forEach(([rows, x, my, color]) => glyph(c, rows, i * W + x, y + my, color)));
  return c;
}

/** Bobo asleep, a strip of frames: the page shows it until the game opens. The z's drift up a pixel every other frame. */
function asleep(): Canvas {
  const c = beats(new Canvas(W * NAPPING.length, H), NAPPING.map(bird => ({ bird })), 0);
  NAPPING.forEach((_, i) => {
    for (const [x, y, n, from, to] of ZS) {
      if (i >= from && i <= to) glyph(c, zGlyph(n), i * W + LEFT + x, y - ((i - from) >> 1) + 2, i === to ? UI.dim : UI.text);
    }
  });
  return c;
}

/** Bobo poked: a row of frames for each of the first four pokes. */
const poked = () => POKED.reduce((c, row, r) => beats(c, row, r * H), new Canvas(W * 4, H * POKED.length));

/** Bobo waking up: the last frame is held until the game starts. */
const waking = () => beats(new Canvas(W * WAKING.length, H), WAKING, 0);

/** German on top, as the loading words. */
function asleepWords(first: 'asleep.deep' | 'asleep.napping', second: 'asleep.later' | 'asleep.poke'): Canvas {
  const LINE = 12, GAP = 6;
  const blocks = LANGUAGES.map(l => [TEXTS[l.id][first], TEXTS[l.id][second]]);
  const w = Math.max(...blocks.flat().map(l => textWidth(l))) + 2;
  const c = new Canvas(w, blocks.length * 2 * LINE + (blocks.length - 1) * GAP);
  blocks.forEach((lines, b) => lines.forEach((l, i) => c.text(l, 1 + ((w - 2 - textWidth(l)) >> 1), 1 + b * (2 * LINE + GAP) + i * LINE, UI.text)));
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
  push(PAGE_IMAGES['page.banner'], banner(out));
  push(PAGE_IMAGES['page.loading'], loadingWords());
  push(PAGE_IMAGES['page.asleep'], asleep());
  push(PAGE_IMAGES['page.asleep_words'], asleepWords('asleep.deep', 'asleep.later'));
  push(PAGE_IMAGES['page.napping_words'], asleepWords('asleep.napping', 'asleep.poke'));
  push(PAGE_IMAGES['page.poked'], poked());
  push(PAGE_IMAGES['page.waking'], waking());
}
