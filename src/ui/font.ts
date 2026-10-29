import type Phaser from 'phaser';
import { css, UI } from './colors';

export const FONT = 'pixel';
export const FONT_H = 7;                 // glyph height without outline
export const LINE_H = FONT_H + 4;
const OUTLINE = css(UI.panel);
const CELL_H = FONT_H + 2;

// Digits share one width, so timers don't jitter.
const G: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['....#', '....#', '....#', '....#', '#...#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  // the one small letter, for a Label with keepCase
  v: ['.....', '.....', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  ß: ['.###.', '#...#', '#..#.', '#.#..', '#..#.', '#...#', '#.##.'],
  Ä: ['.#.#.', '.....', '.###.', '#...#', '#####', '#...#', '#...#'],
  Ö: ['.#.#.', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  Ü: ['.#.#.', '.....', '#...#', '#...#', '#...#', '#...#', '.###.'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
  '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  '·': ['.', '.', '.', '#', '.', '.', '.'],
  '♥': ['.....', '##.##', '#####', '#####', '.###.', '..#..', '.....'],
  '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..'],
  '↓': ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
  '←': ['.......', '..#....', '.#.....', '#######', '.#.....', '..#....', '.......'],
  '→': ['.......', '....#..', '.....#.', '#######', '.....#.', '....#..', '.......'],
};

type Pen = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>;

function drawGlyph(ctx: Pen, rows: string[], x: number, y: number, fill: string): void {
  const w = rows[0].length;
  const on = (gx: number, gy: number) => rows[gy]?.[gx] === '#';
  for (let gy = -1; gy <= FONT_H; gy++) for (let gx = -1; gx <= w; gx++) {
    let color: string | null = null;
    if (on(gx, gy)) color = fill;
    else {
      for (let dy = -1; dy <= 1 && !color; dy++) for (let dx = -1; dx <= 1 && !color; dx++) if (on(gx + dx, gy + dy)) color = OUTLINE;
    }
    if (color) { ctx.fillStyle = color; ctx.fillRect(x + gx, y + gy, 1, 1); }
  }
}

export function drawText(ctx: Pen, text: string, x: number, y: number, fill = 0xffffff): void {
  let pen = x;
  for (const ch of fontText(text)) {
    const rows = G[ch] ?? G[' '];
    drawGlyph(ctx, rows, pen, y, css(fill));
    pen += rows[0].length + 2;
  }
}

export function makeFont(scene: Phaser.Scene): void {
  const glyphs = Object.entries(G);
  const texW = glyphs.reduce((sum, [, rows]) => sum + rows[0].length + 2, 0);
  const tex = scene.textures.createCanvas(FONT, texW, CELL_H)!;
  const ctx = tex.getContext();
  const chars: Record<number, object> = {};

  let cx = 0;
  for (const [ch, rows] of glyphs) {
    const w = rows[0].length, cw = w + 2;
    drawGlyph(ctx, rows, cx + 1, 1, '#ffffff');
    // Phaser's ParseRetroFont layout (v is flipped in Phaser 4), but with per-glyph widths
    chars[ch.charCodeAt(0)] = {
      x: cx, y: 0, width: cw, height: CELL_H, centerX: Math.floor(cw / 2), centerY: Math.floor(CELL_H / 2),
      xOffset: -1, yOffset: -1, xAdvance: w + 2, data: {}, kerning: {},
      u0: cx / texW, v0: 1, u1: (cx + cw) / texW, v1: 0,
    };
    cx += cw;
  }
  tex.refresh();

  scene.cache.bitmapFont.add(FONT, {
    data: { retroFont: true, font: FONT, size: FONT_H, lineHeight: FONT_H + 3, chars },
    texture: FONT,
    frame: null,
  });
}

/** ß stays: upper-cased it's SS. */
export const fontText = (text: string, keepCase = false): string =>
  [...text].map(ch => (ch === 'ß' || (keepCase && Object.prototype.hasOwnProperty.call(G, ch)) ? ch : ch.toUpperCase())).join('');

export const missingGlyphs = (text: string): string[] => [...new Set([...fontText(text)].filter(ch => !Object.prototype.hasOwnProperty.call(G, ch)))];

export function textWidth(text: string, scale = 1, keepCase = false): number {
  let w = 0;
  for (const ch of fontText(text, keepCase)) w += ((G[ch] ?? G[' '])[0].length + 2);
  return Math.max(0, w - 2) * scale;
}

/** Words between `~`s are struck through. */
export function parseStrikes(text: string): { plain: string; struck: boolean[] } {
  let plain = '', on = false;
  const struck: boolean[] = [];
  for (const ch of text) {
    if (ch === '~') { on = !on; continue; }
    plain += ch;
    struck.push(on);
  }
  return { plain, struck };
}

export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(next) > maxWidth) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}
