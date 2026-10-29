import { readFileSync } from 'node:fs';
import { IMAGES, SHEETS, type ImageKey, type SheetKey } from '../../../src/assets/manifest.ts';
import { opacity, paint, paintAscii, paintSheet, type Img, type PixelFn, type Pixels } from './pixels.ts';
import { pngPixels } from './png.ts';

export function sheet(out: Img[], key: SheetKey, frames: PixelFn[], outline?: number): Img {
  const { file, w, h } = SHEETS[key];
  return paintSheet(out, file, w, h, frames, outline);
}

export function image(out: Img[], key: ImageKey, w: number, h: number, fn: PixelFn, outline?: number): Img {
  return paint(out, IMAGES[key], w, h, fn, outline);
}

export function asciiImage(out: Img[], key: ImageKey, rows: string[], palette: Record<string, number>, outline?: number): Img {
  return paintAscii(out, IMAGES[key], rows, palette, outline);
}

const isSheet = (key: ImageKey | SheetKey): key is SheetKey => key in SHEETS;

/** As painted if it's in `out`, else its file under public/assets/; half see-through and less is transparent. */
export function pixelsOf(out: Img[], key: ImageKey | SheetKey): Pixels {
  const file = isSheet(key) ? SHEETS[key].file : IMAGES[key];
  const { w, h, px } = out.find(i => i.file === file) ?? pngPixels(readFileSync(`public/assets/${file}`));
  return { w, h, px: px.map(c => (c !== null && opacity(c) > 127 ? c & 0xffffff : null)) };
}
