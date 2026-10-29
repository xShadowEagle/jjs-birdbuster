import { ascii, mix, paintAscii, seeThrough, type Img, type PixelFn } from './lib/pixels.ts';
import { asciiImage, image, sheet } from './lib/assets.ts';
import { PAGE_IMAGES } from '../../src/assets/manifest.ts';
import { RAINBOW, UI } from '../../src/ui/colors.ts';
import { beside, noise } from './lib/shapes.ts';
import { RIVAL_IDS } from '../../src/rivals.ts';
import { COCONUT, DUST, OUTLINE, PLUMAGE, rainbowAt, type Plumage } from './palette.ts';

const FEATHER = { light: 0xf6f6f8, mid: 0xd4d5dc, edge: 0xa8aab6, tip: 0x80828f, shaft: 0x8c8c96, quill: 0x64646e, outline: 0x33333d };

const feather: PixelFn = (x, y) => {
  const C = FEATHER, tx = 13.5, ty = 1.5, bx = 2.5, by = 14.5;
  const L = Math.hypot(bx - tx, by - ty), dx = (bx - tx) / L, dy = (by - ty) / L;
  const px = x + 0.5 - tx, py = y + 0.5 - ty;
  const u = px * dx + py * dy, v = px * -dy + py * dx, t = u / L;
  if (t < -0.02 || t > 1.02) return null;
  if (Math.abs(v) <= 0.55 && t > 0.06) return t > 0.78 ? C.quill : C.shaft;
  if (t > 0.78) return null;
  const half = t < 0.35 ? 2.9 * Math.sin((t / 0.35) * Math.PI / 2) : 2.9 * (1 - ((t - 0.35) / 0.43) * 0.65);
  if (Math.abs(v) > half) return null;
  if (v > half * 0.25 && (Math.abs(t - 0.42) < 0.035 || Math.abs(t - 0.6) < 0.035)) return null;
  if (t < 0.16) return C.tip;
  return Math.abs(v) / half > 0.7 ? C.edge : v < 0 ? C.light : C.mid;
};

const KEY = [
  '.................',
  '....L.L.L........',
  '....LBLBL........',
  '...LLLBBBs.......',
  '.kkLLwrBBs.......',
  '.KkBBrrBss.......',
  '...BBBBBsLLLLLLL.',
  '....sBBsssssssss.',
  '.....sss....B.B..',
  '............D.D..',
  '.................',
];
const keyColours = (p: Plumage) => ({ L: p.light, B: p.body, s: p.shade, D: p.shade2, r: p.eye, w: 0xffffff, k: p.beak, K: p.beakDark });

export function makeItems(out: Img[]): void {
  image(out, 'item.feather', 16, 16, feather, FEATHER.outline);
  asciiImage(out, 'item.berry', [
    '............',
    '.....g.g....',
    '...gGgggG...',
    '...rgLLgr...',
    '..rhrhrrrr..',
    '..hrHrrrrr..',
    '.hrhrrrrrmr.',
    '.rhrrrrrmrd.',
    '.hrrrrrmrdd.',
    '..rrrmmrdd..',
    '..rrmrrddd..',
    '....rmdd....',
    '............',
  ], { H: 0xfff0f0, h: 0xff9aa6, r: 0xe8384c, m: 0xc42438, d: 0x8e1428, g: 0x5aa83a, L: 0x9ae06a, G: 0x3a7a2a }, OUTLINE);
  asciiImage(out, 'item.firefly', [
    '..............',
    '...k......k...',
    '....k....k....',
    '.ww..BBBB..ww.',
    '.weebebbebeew.',
    '.weewbbbbweew.',
    '..wwwoooowww..',
    '.....yyyy.....',
    '....yYCCYy....',
    '....yYCCYy....',
    '.....yYYy.....',
    '......yy......',
    '..............',
  ], { w: 0xd8ecf8, e: 0xffffff, B: 0x6e6a8c, b: 0x4e4a66, k: 0x2e2a3a, o: 0xf0783a, y: 0xd6f04a, Y: 0xf4ff9a, C: 0xffffe0 }, OUTLINE);
  asciiImage(out, 'item.coconut', [
    '.............',
    '....lllmm....',
    '...llememm...',
    '..lllmemmmm..',
    '..lfmmmmfmm..',
    '.llmmmmmmmdd.',
    '.lmmfmmmmddd.',
    '..mmmmmmddd..',
    '..mmmmfdddd..',
    '...mmmdddd...',
    '.....ddd.....',
    '.............',
  ], COCONUT, OUTLINE);
  for (const r of RIVAL_IDS) asciiImage(out, `item.key.${r}`, KEY, keyColours(PLUMAGE[r]), OUTLINE);
}

const GLOW_D = 30;
/** [reach (0 the centre to 1 the edge), opacity] */
const GLOW_RINGS = [[0.35, 0.9], [0.65, 0.45], [1, 0.198]];
const glow: PixelFn = (x, y) => {
  const r = GLOW_D / 2, d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
  const ring = GLOW_RINGS.find(([reach]) => d < reach);
  return ring ? seeThrough(0xffe890, ring[1]) : null;
};

const AIR = 0xc8f0ff, AIR_EDGE = 0xffffff;
function bowShock(x: number, y: number): { f: number; n: number; dy: number; tail: number } {
  const AX = 39.5, AY = 24, R = 12, S = 0.8;
  const px = x + 0.5, py = y + 0.5, t = AX - px, dy = py - AY;
  const q = Math.sqrt(R * R + (dy / S) ** 2);
  return { f: t - (q - R), n: Math.hypot(1, dy / (S * S * q)), dy, tail: Math.min(1, (AY - Math.abs(dy)) / 8) };
}
const dashCone = (frame: number): PixelFn => (x, y) => {
  const { f, n, tail } = bowShock(x, y);
  if (tail <= 0) return null;
  if (Math.abs(f) / n < 0.6) return seeThrough(AIR_EDGE, 0.9 * tail);
  const o = 4 + frame * 2;
  if (Math.abs(f - o) / n < 0.55) return seeThrough(AIR, 0.55 * tail);
  return f > 0 && f < o ? seeThrough(AIR, 0.22 * tail) : null;
};

/** t: 0 to 1 across the bands */
const rainbowAcross = (t: number) => RAINBOW[Math.min(5, Math.floor(t * 6))];
const rainbowCone = (frame: number): PixelFn => (x, y) => {
  const { f, n, dy, tail } = bowShock(x, y), d = f / n;
  if (tail <= 0 || d < -0.6) return null;
  if (d < 1) return seeThrough(rainbowAcross((dy + 24) / 48), 0.9 * tail);
  const o = 4 + frame * 2;
  if (Math.abs(d - o) < 0.55) return seeThrough(AIR_EDGE, 0.6 * tail);
  return d < o ? seeThrough(AIR, 0.15 * tail) : null;
};
const rainbowBlast = (frame: number): PixelFn => (x, y) => {
  const px = x + 0.5 - 32, py = y + 0.5 - 32, R = 7 + frame * 4.6, fade = 1 - frame / 7;
  if (Math.abs(Math.hypot(px, py) - R) < 0.7) return seeThrough(rainbowAt(Math.atan2(py, px)), 0.85 * fade);
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4, v = 0.55 + ((i * 7) % 5) * 0.12, cx = Math.cos(a) * R * v * 1.3, cy = Math.sin(a) * R * v * 1.3 + frame * frame * 0.4;
    if (Math.abs(px - cx) < 1 && Math.abs(py - cy) < 1) return seeThrough(RAINBOW[i % 6], fade);
  }
  return null;
};

/** s: times fx.slash's size. k: 0 at the leading edge to 1 at the back; t: 0 in the middle to 1 at the tips. */
function crescent(x: number, y: number, s: number): { k: number; t: number; fade: number } | null {
  const px = x + 0.5, py = y + 0.5, dy = py - 20 * s, R = 27 * s, r = 24 * s, t = Math.abs(dy) / (20 * s);
  if (t >= 1 || Math.hypot(px - 6 * s, dy) > R || Math.hypot(px - 2 * s, dy) <= r || px < 9 * s) return null;
  const outerX = 6 * s + Math.sqrt(R * R - dy * dy), innerX = Math.abs(dy) < r ? 2 * s + Math.sqrt(r * r - dy * dy) : 9 * s;
  return { k: (outerX - px) / Math.max(1, outerX - innerX), t, fade: Math.min(1, (1 - t) / 0.3) };
}
const LIME = { edge: 0xf4ffc8, light: 0xc8ff6a, body: 0x8ee040 };
const LIME_SCALE = 0.55;
const limeSlash = (frame: number): PixelFn => (x, y) => {
  const c = crescent(x, y, LIME_SCALE);
  if (c) return seeThrough(c.k < 0.25 ? 0xffffff : c.k < 0.6 ? LIME.edge : LIME.light, c.fade);
  const inSlash = (qx: number, qy: number) => (crescent(qx, qy, LIME_SCALE)?.t ?? 1) < 0.9;
  for (let d = 1; d <= 2; d++) if (beside(inSlash, x, y, d)) return seeThrough(LIME.body, (frame ? 0.45 : 0.3) / d);
  return null;
};

const orb = (frame: number): PixelFn => (x, y) => {
  const dx = x + 0.5 - 6, dy = y + 0.5 - 6, d = Math.hypot(dx, dy);
  if (d > 5) return null;
  if (Math.hypot(dx + 1.8, dy + 1.8) < 1.2) return 0xffffff;
  const turn = (Math.atan2(dy, dx) / (Math.PI * 2) + 1 + frame / 4 + d * 0.06) % 1;
  const c = RAINBOW[Math.floor(turn * 6) % 6];
  return d > 3.8 ? mix(c, 0x000000, 0.28) : c;
};

const rainbowBeam = (frame: number): PixelFn => (x, y) => {
  const c = crescent(x - 1, y - 1, 1);
  if (!c) return null;
  return noise(x * 7 + frame * 13, y * 5 + frame * 29) > 0.9 && c.t < 0.8 ? 0xffffff : seeThrough(rainbowAcross(c.k), 0.95 * c.fade);
};

export function makeFx(out: Img[]): void {
  asciiImage(out, 'fx.spark', [
    '..w..',
    '.wyw.',
    'wyYyw',
    '.wyw.',
    '..w..',
  ], { w: 0xfff3b0, y: 0xffe08a, Y: 0xffffff });
  const POP = { W: 0xffffff, w: 0xfff3b0, y: 0xffe08a };
  sheet(out, 'fx.peck', [
    ['...........', '...........', '...........', '....WWW....', '...W...W...', '...W.W.W...', '...W...W...', '....WWW....', '...........', '...........', '...........'],
    ['...........', '...wwwww...', '..w.....w..', '.w.......w.', '.w.......w.', '.w.......w.', '.w.......w.', '.w.......w.', '..w.....w..', '...wwwww...', '...........'],
    ['...y...y...', '.y.......y.', '...........', 'y.........y', '...........', '...........', '...........', 'y.........y', '...........', '.y.......y.', '...y...y...'],
  ].map(rows => ascii(rows, POP)));
  image(out, 'fx.slash', 34, 40, (x, y) => {
    const c = crescent(x, y, 1);
    return c && seeThrough(c.k < 0.2 ? AIR_EDGE : AIR, (1 - 0.65 * c.k) * c.fade);
  });
  sheet(out, 'fx.dash', [0, 1, 2].map(dashCone));
  sheet(out, 'fx.rainbow_cone', [0, 1, 2].map(rainbowCone));
  sheet(out, 'fx.rainbow_blast', [0, 1, 2, 3, 4, 5].map(rainbowBlast));
  // white: tinted in the game
  asciiImage(out, 'fx.star', ['.......', '...w...', '..wWw..', '.wWWWw.', '..wWw..', '...w...', '.......'], { w: 0xc8c8c8, W: 0xffffff });
  sheet(out, 'fx.rainbow_beam', [0, 1, 2].map(rainbowBeam));
  sheet(out, 'fx.lime_slash', [0, 1].map(limeSlash));
  sheet(out, 'fx.orb', [0, 1, 2, 3].map(orb), OUTLINE);
  // drawn additively
  image(out, 'fx.glow', GLOW_D, GLOW_D, glow);
  image(out, 'fx.puff', 6, 6, (x, y) => {
    const d = Math.hypot(x - 2.5, y - 2.5);
    return d > 2.9 ? null : d > 2 ? DUST.edge : DUST.light;
  });
}

export function makeHudIcons(out: Img[]): void {
  const pal = { w: UI.text };
  // portrait: the rotate overlay turns it 90 degrees
  paintAscii(out, PAGE_IMAGES['ui.phone'], [
    '.cccccccccc.',
    'cccccccccccc',
    'ccbbbbbbbbcc',
    'ccbllbbbbbcc',
    'ccblbbbbbbcc',
    ...Array(10).fill('ccbbbbbbbbcc'),
    'cccccccccccc',
    'ccccckkccccc',
    '.cccccccccc.',
  ], { c: 0xf4e9c8, b: 0x3a4fb8, l: 0x8ea4ff, k: 0x9a8f78 });
  asciiImage(out, 'ui.pause', [
    '.........',
    '.ww..ww..',
    '.ww..ww..',
    '.ww..ww..',
    '.ww..ww..',
    '.ww..ww..',
    '.ww..ww..',
    '.ww..ww..',
    '.........',
  ], pal, UI.panel);
  asciiImage(out, 'ui.sound', [
    '...........',
    '....w......',
    '...ww..w...',
    '.www.w..w..',
    '.www.w.w.w.',
    '.www.w.w.w.',
    '.www.w..w..',
    '...ww..w...',
    '....w......',
    '...........',
  ], pal, UI.panel);
  const heart = [
    '...........',
    '..hh...hh..',
    '.hwwr.hrrr.',
    '.hwrrrrrrd.',
    '.rrrrrrrrd.',
    '..rrrrrrd..',
    '...rrrrd...',
    '....rrd....',
    '.....d.....',
    '...........',
  ];
  asciiImage(out, 'ui.heart', heart, { w: 0xffffff, h: 0xff8a9c, r: UI.hp, d: 0xa82840 }, UI.panel);
  asciiImage(out, 'ui.heart_empty', heart, { w: 0x4e4466, h: 0x4e4466, r: UI.trough, d: 0x2a2240 }, UI.panel);
  asciiImage(out, 'ui.mute', [
    '...........',
    '....w......',
    '...ww......',
    '.www.w.w.w.',
    '.www.w..w..',
    '.www.w..w..',
    '.www.w.w.w.',
    '...ww......',
    '....w......',
    '...........',
  ], pal, UI.panel);
}
