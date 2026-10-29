import { ascii, type Img, type PixelFn } from './lib/pixels.ts';
import { bayer, ell, fluffy, noise, segDist, turned } from './lib/shapes.ts';
import { asciiImage, image, sheet } from './lib/assets.ts';
import { CAT_COLOURS, JJ, OUTLINE, PLUMAGE, type Plumage } from './palette.ts';
import { UI } from '../../src/ui/colors.ts';
import { RIVAL_IDS } from '../../src/rivals.ts';
import type { Emote } from '../../src/story/cutscene.ts';

const LOCK = [
  '...........',
  '...sSSSs...',
  '..sS...Ss..',
  '..S.....S..',
  '.LLLLLLLLB.',
  '.LBBBBBBBD.',
  '.LBBkkkBBD.',
  '.LBBkkkBBD.',
  '.LBBBkBBBD.',
  '.LBBBkBBBD.',
  '.DDDDDDDDD.',
  '...........',
];
const lockColours = (p: Plumage) => ({ S: 0xd8dee8, s: 0x8a94a6, L: p.light, B: p.body, D: p.shade2, k: OUTLINE });

/** Layers: the first one with a colour at (x, y) wins. */
const stack = (...fs: PixelFn[]): PixelFn => (x, y) => { for (const f of fs) { const c = f(x, y); if (c !== null) return c; } return null; };
const at = (fn: PixelFn, dx: number, dy: number): PixelFn => (x, y) => fn(x - dx, y - dy);

function cake(frame: number, bitten = false): PixelFn {
  const K = { plate: 0xe8e8f0, plateDark: 0xb8b8c8, ribbonLight: 0x5ac8bc, cream: 0xfff4e0, wick: 0x3a2a2a, flame: 0xffd35a, flameTip: 0xff8a3c, glow: 0xfff4c0, sponge: 0xf6d8a0 };
  const candle = (cx: number, tall: boolean): PixelFn => (x, y) => {
    const top = 6, flame = top - (tall ? 4 : 3);
    if (x !== cx || y < flame || y > 9) return null;
    if (y === flame) return K.flameTip;
    if (y < top - 1) return y === top - 2 && tall ? K.glow : K.flame;
    if (y === top - 1) return K.wick;
    return (y - top) % 2 ? K.cream : JJ.scarf;
  };
  const bite = (x: number, y: number) => bitten && fluffy(x + 0.5, y + 0.5, 24.5, 9.5, 6.4, 6.4, 7, 0.12);
  return stack(
    ...[6, 13, 19].map((cx, i) => candle(cx, (i + frame) % 2 === 0)).map((c, i): PixelFn => (x, y) => (bitten && i === 2 ? null : c(x, y))),
    (x, y) => {
      if (x < 2 || x > 23 || y < 10 || y > 21 || bite(x, y)) return null;
      if (bite(x - 1, y) || bite(x, y - 1) || bite(x + 1, y - 1)) return y === 18 || y === 19 ? K.cream : K.sponge;
      const side = x >= 21;
      if (y === 18 || y === 19) return side ? JJ.scarfDark : y === 18 ? K.ribbonLight : JJ.scarf;
      if (y === 10) return JJ.hairLight;
      if (y === 11 && x % 3 === 0) return K.cream;
      return side ? JJ.hairDark : JJ.hair;
    },
    (x, y) => (ell(x + 0.5, y + 0.5, 13, 22.5, 12.5, 1.6) ? (y + 0.5 > 22.5 ? K.plateDark : K.plate) : null),
  );
}

function picnic(): PixelFn {
  const W = 52;
  const TOP = [0xfff4f0, 0xf08a90, 0xd84050], EDGE = [0xe0d0cc, 0xc05a64, 0xa82838];
  const along = (x: number) => Number(Math.floor((x + 1) / 4) % 2 === 0);
  const blanket: PixelFn = (x, y) => {
    const fold = x + y;
    if (fold > 62) return null;
    if (y === 15) return x % 2 === 0 ? EDGE[along(x) + 1] : null;
    if (y < 10 || y > 14) return null;
    const inset = Math.max(0, 13 - y);
    if (x < inset || x >= W - inset) return null;
    if (fold > 58) return fold === 62 ? 0xd8c4c0 : 0xf4e4e0;
    const n = along(x) + Number(y <= 11);
    return y === 14 ? EDGE[n] : TOP[n];
  };
  const basket = ascii([
    '....hhhhhh....',
    '...h......h...',
    '..h........h..',
    '..h........h..',
    '..h........h..',
    '.LLLnmnmLLLLL.',
    '.lllmnmnmllll.',
    '.ABAnmnmnABAB.',
    '.bBbBmnmBbBbB.',
    '.ABABAnABABAB.',
    '.bBbBbBbBbBbB.',
    '.ABABABABABAB.',
    '.dddddddddddd.',
  ], { h: 0x7a4a2a, L: 0xe8c080, l: 0xc8965a, A: 0xd8a860, B: 0xb8864a, b: 0x8a5a32, d: 0x6a4228, n: JJ.scarf, m: 0x9ae0d8 });
  const apple = ascii(['.s.', 'rwr', 'rrR', '.R.'], { s: 0x6a4228, w: 0xff9a8a, r: 0xe0403a, R: 0xb02a2a });
  return stack(at(basket, 33, 1), at(apple, 29, 9), blanket);
}

/** `symbol`: # filled */
function emote(out: Img[], name: Emote, symbol: string[], color: number): void {
  const rows = [
    '...wwwww...',
    '..wwwwwww..',
    '.wwwwwwwww.',
    'wwwwwwwwwww',
    'wwwwwwwwwww',
    'wwwwwwwwwww',
    'wwwwwwwwwww',
    '.wwwwwwwww.',
    '..wwwwwww..',
    '...wwwww...',
    '....ww.....',
    '....w......',
  ].map((r, y) => r.split('').map((c, x) => {
    const s = symbol[y - 2]?.[x - 3];
    return s === '#' ? 's' : c;
  }).join(''));
  asciiImage(out, `emote.${name}`, ['.............', ...rows.map(r => `.${r}.`), '.............'], { w: 0xffffff, s: color }, OUTLINE);
}

function nest(): PixelFn {
  const H = 28, CX = 45, TOP = 9;
  const T = { dark: 0x3a2618, twig: 0x5e3e24, mid: 0x7a5230, light: 0x9a6a3c, hi: 0xc08e54, straw: 0xd8b060, strawDark: 0xa8823a, down: 0xf6f6fa, downShade: 0xcacad4 };
  const PLUME = {
    lime: { hi: PLUMAGE.lime.shine, body: PLUMAGE.lime.body, shade: PLUMAGE.lime.shade },
    teal: { hi: PLUMAGE.teal.shine, body: PLUMAGE.teal.body, shade: PLUMAGE.teal.shade },
    grey: { hi: PLUMAGE.grey.shine, body: PLUMAGE.grey.light, shade: PLUMAGE.grey.shade },
  };
  /** [base x, y, lean (degrees, clockwise), length, whose] */
  const FEATHERS: [number, number, number, number, keyof typeof PLUME][] = [[20, TOP + 12, -50, 9, 'lime'], [45, TOP + 12, 50, 9, 'teal'], [70, TOP + 12, -50, 9, 'grey']];
  const POKES: [number, number, number, number][] = [
    [8, TOP + 2, 3, TOP - 2], [30, TOP, 28, TOP - 3], [62, TOP, 65, TOP - 3], [83, TOP + 2, 88, TOP - 1],
    [2, TOP + 6, -2, TOP + 3], [88, TOP + 7, 91, TOP + 5], [48, TOP, 50, TOP - 4], [20, TOP + 1, 16, TOP - 2], [70, TOP + 15, 75, TOP + 18],
  ];
  const STRAW: [number, number, number, number][] = [[11, TOP + 1, 9, TOP + 6], [41, TOP + 1, 42, TOP + 7], [63, TOP + 1, 61, TOP + 5], [79, TOP + 1, 81, TOP + 6]];
  const DOWN = [[33, TOP - 0.5], [46, TOP - 0.2], [84, TOP + 0.5]];
  const inBowl = (px: number, py: number) => py >= TOP && ell(px, py, CX, TOP + 1, CX - 0.5, H - TOP - 1);
  const feather = (px: number, py: number): number | null => {
    for (const [bx, by, lean, len, p] of FEATHERS) {
      const r = (lean * Math.PI) / 180, tipX = bx + Math.sin(r) * len, tipY = by - Math.cos(r) * len;
      if (segDist(px, py, bx, by, tipX, tipY) < 0.45) return PLUME[p].shade;
      const [u, v] = turned(px, py, bx + Math.sin(r) * len * 0.55, by - Math.cos(r) * len * 0.55, lean);
      if (ell(u, v, 0, 0, 2.1, len * 0.45)) return u < -0.6 ? PLUME[p].hi : u > 0.9 ? PLUME[p].shade : PLUME[p].body;
    }
    return null;
  };
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const f = feather(px, py);
    if (f !== null) return f;
    if (DOWN.some(([dx, dy]) => ell(px, py, dx, dy, 2, 1.4))) return py > TOP ? T.downShade : T.down;
    if (POKES.some(([ax, ay, bx, by]) => segDist(px, py, ax, ay, bx, by) < 0.6)) return noise(x, y) > 0.6 ? T.hi : T.light;
    if (STRAW.some(([ax, ay, bx, by]) => segDist(px, py, ax, ay, bx, by) < 0.5)) return py < TOP + 3 ? T.straw : T.strawDark;
    const lump = noise(Math.floor(x / 3), 40);
    if (y === TOP - 1 && lump > 0.7 && inBowl(px, py + 1)) return lump > 0.85 ? T.straw : T.hi;
    if (y === TOP && lump < 0.12) return null;
    if (!inBowl(px, py)) return null;
    if (y <= TOP + 1) return noise(x, 31) > 0.7 ? T.straw : noise(x, 32) > 0.5 ? T.hi : T.light;
    const a = Math.floor((x + y * 1.6 + noise(Math.floor(x / 3), 7) * 3) / 3) % 3, b = Math.floor((x - y * 1.4 + 200) / 4) % 3;
    const c = a === 0 ? (b === 0 ? T.dark : T.mid) : b === 0 ? T.twig : T.light;
    return y > H - 5 ? (bayer(x, y) < 0.5 ? T.dark : T.twig) : y > H - 8 && c === T.light ? T.mid : c;
  };
}

export function makeProps(out: Img[]): void {
  sheet(out, 'prop.cake', [cake(0), cake(1), cake(0, true), cake(1, true)], OUTLINE);
  image(out, 'prop.nest', 90, 28, nest(), OUTLINE);
  asciiImage(out, 'prop.cat_feather', [
    '......qqr',
    '.....fqrt',
    '....ffFt.',
    '...ffFf..',
    '..ffFf...',
    '..fFf....',
    '..Ff.....',
    '.F.......',
    'F........',
  ], CAT_COLOURS, OUTLINE);
  asciiImage(out, 'prop.note', [
    '................',
    '.wwwwwwwwwwwS...',
    '.wkkkkkkkwkkSS..',
    '.wwwwwwwwwwwSSS.',
    '.wkkkkwkkkkkkww.',
    '.ssssssssssssss.',
    '.wkkkkkkwwwpwpw.',
    '.wwwwwwwwwwpppw.',
    '.wwwwwwwwwwwpww.',
    '................',
  ], { w: UI.text, s: 0xe0d4b4, S: 0xcfc09a, k: 0x7a6a5a, p: 0xe8407a }, OUTLINE);
  image(out, 'prop.picnic', 52, 16, picnic(), OUTLINE);
  for (const r of RIVAL_IDS) asciiImage(out, `prop.lock.${r}`, LOCK, lockColours(PLUMAGE[r]), OUTLINE);

  emote(out, 'exclaim', ['..#..', '..#..', '..#..', '..#..', '.....', '..#..'], 0xe03a4a);
  emote(out, 'question', ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], 0x3a7ad8);
  emote(out, 'heart', ['.....', '##.##', '#####', '.###.', '..#..', '.....'], 0xe8407a);
  emote(out, 'dots', ['.....', '.....', '.....', '#.#.#', '.....', '.....'], 0x3a3a4a);
  emote(out, 'anger', ['#.#..', '.#...', '#.#..', '...#.', '..#.#', '...#.'], 0xe03a4a);
}
