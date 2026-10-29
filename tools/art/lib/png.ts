import { deflateSync, inflateSync } from 'node:zlib';
import { opacity, type Pixels } from './pixels.ts';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng({ w, h, px }: Pixels): Uint8Array {
  const header = new Uint8Array(13);
  const hv = new DataView(header.buffer);
  hv.setUint32(0, w); hv.setUint32(4, h);
  header.set([8, 6, 0, 0, 0], 8);

  const raw = new Uint8Array(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 4);
    for (let x = 0; x < w; x++) {
      const c = px[y * w + x], o = row + 1 + x * 4;
      if (c === null) continue;
      raw[o] = (c >> 16) & 255; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255; raw[o + 3] = opacity(c);
    }
  }

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return concat([sig, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array())]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

const u32 = (bytes: Uint8Array, o: number) => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;

export function pngSize(bytes: Uint8Array): [number, number] {
  return [u32(bytes, 16), u32(bytes, 20)];
}

interface Rgba { w: number; h: number; rgba: Uint8Array }

const BPP: Partial<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePng(bytes: Uint8Array): Rgba {
  let o = 8, w = 0, h = 0, type = 0, plte: Uint8Array | undefined, trns: Uint8Array | undefined;
  const idat: Uint8Array[] = [];
  while (o < bytes.length) {
    const n = u32(bytes, o), t = String.fromCharCode(...bytes.subarray(o + 4, o + 8)), d = bytes.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') {
      w = u32(bytes, o + 8); h = u32(bytes, o + 12); type = d[9];
      if (d[8] !== 8 || d[12] !== 0) throw new Error(`only 8-bit, non-interlaced PNGs (bit depth ${d[8]}, interlace ${d[12]})`);
    } else if (t === 'PLTE') plte = d;
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  const bpp = BPP[type];
  if (!bpp) throw new Error(`PNG colour type ${type}`);
  const raw = inflateSync(concat(idat)), stride = w * bpp, rgba = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      cur[i] = (line[i] + pred) & 255;
    }
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4, s = x * bpp;
      if (type === 6) rgba.set(cur.subarray(s, s + 4), q);
      else if (type === 2) rgba.set([cur[s], cur[s + 1], cur[s + 2], 255], q);
      else if (type === 0) rgba.set([cur[s], cur[s], cur[s], 255], q);
      else if (type === 4) rgba.set([cur[s], cur[s], cur[s], cur[s + 1]], q);
      else if (plte) { const i = cur[s]; rgba.set([plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2], trns && i < trns.length ? trns[i] : 255], q); }
      else throw new Error('a palette PNG without a PLTE chunk');
    }
    [prev, cur] = [cur, prev];
  }
  return { w, h, rgba };
}

export function pngPixels(bytes: Uint8Array): Pixels {
  const { w, h, rgba } = decodePng(bytes);
  return { w, h, px: Array.from({ length: w * h }, (_, i) => {
    const [r, g, b, a] = rgba.subarray(i * 4, i * 4 + 4);
    return a ? ((r << 16) | (g << 8) | b | ((255 - a) << 24)) >>> 0 : null;
  }) };
}
