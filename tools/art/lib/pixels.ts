/** 0xRRGGBB (or partly see-through: seeThrough), or null for transparent. */
export type Px = number | null;

/** `alpha` (0 to 1) opaque. The top byte holds how see-through it is, so a plain 0xRRGGBB stays opaque. */
export const seeThrough = (c: number, alpha: number): number => (c | (Math.round((1 - alpha) * 255) << 24)) >>> 0;
/** 0 to 255 */
export const opacity = (c: number): number => 255 - (c >>> 24);
/** `t` (0 to 1) of `b` mixed in, then `dim` times as bright. */
export const mix = (a: number, b: number, t: number, dim = 1): number =>
  [16, 8, 0].reduce((c, sh) => c | (Math.round((((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) * dim) << sh), 0);
/** (x, y): the pixel's top-left corner. */
export type PixelFn = (x: number, y: number) => Px;

export interface Pixels { w: number; h: number; px: Px[] }
export interface Img extends Pixels { file: string }

export function paint(out: Img[], file: string, w: number, h: number, fn: PixelFn, outline?: number): Img {
  const img = { file, w, h, px: render(file, w, h, fn, outline) };
  out.push(img);
  return img;
}

/** '.' and chars missing from `palette` are transparent. */
export function paintAscii(out: Img[], file: string, rows: string[], palette: Record<string, number>, outline?: number): Img {
  const w = Math.max(...rows.map(r => r.length));
  return paint(out, file, w, rows.length, ascii(rows, palette), outline);
}

export const ascii = (rows: string[], palette: Record<string, number>): PixelFn =>
  (x, y) => palette[rows[y]?.[x] ?? '.'] ?? null;

export function paintSheet(out: Img[], file: string, fw: number, fh: number, frames: PixelFn[], outline?: number): Img {
  const w = fw * frames.length;
  const px: Px[] = new Array(w * fh).fill(null);
  frames.forEach((fn, i) => {
    const f = render(`${file} frame ${i}`, fw, fh, fn, outline);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) px[y * w + i * fw + x] = f[y * fw + x];
  });
  const img = { file, w, h: fh, px };
  out.push(img);
  return img;
}

function render(what: string, w: number, h: number, fn: PixelFn, outline?: number): Px[] {
  const grid: Px[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fn(x, y);
    if (c === undefined) throw new Error(`${what}: the pixel at ${x}, ${y} is undefined (return null for transparent)`);
    grid.push(c);
  }
  if (outline === undefined) return grid;
  const filled = grid.map(c => c !== null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (filled[y * w + x]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
      const nx = x + dx, ny = y + dy;
      near = nx >= 0 && ny >= 0 && nx < w && ny < h && filled[ny * w + nx];
    }
    if (near) grid[y * w + x] = outline;
  }
  return grid;
}
