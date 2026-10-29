// All coordinates are pixel centres (x + 0.5, y + 0.5) unless noted. Pitfall: with a fractional centre,
// compare pixel columns with Math.floor on both sides: `Math.floor(px) === 10.5` is never true.

export const ell = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, k = 1) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= k * k;

/** `deg`: clockwise, as y points down. */
export const turned = (x: number, y: number, cx: number, cy: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
  return [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)];
};

export const rell = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, deg: number) => {
  const [u, v] = turned(x, y, cx, cy, deg);
  return ell(u, v, 0, 0, rx, ry);
};

export const tri = (x: number, y: number, [ax, ay]: number[], [bx, by]: number[], [cx, cy]: number[]) => {
  const s = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

export const segDist = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
};

export const beside = (inside: (x: number, y: number) => boolean, x: number, y: number, d = 1) =>
  inside(x + d, y) || inside(x - d, y) || inside(x, y + d) || inside(x, y - d);

export const fluffy = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, bumps: number, amp: number, phase = 0) => {
  const a = Math.atan2((y - cy) / ry, (x - cx) / rx);
  return ell(x, y, cx, cy, rx, ry, 1 + amp * Math.sin(a * bumps + phase));
};

export const rfluffy = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, deg: number, bumps: number, amp: number) => {
  const [u, v] = turned(x, y, cx, cy, deg);
  return fluffy(u, v, 0, 0, rx, ry, bumps, amp);
};

/** 4x4 ordered-dither thresholds, 0 to 1 */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

/** 0..1 per integer pixel: same input, same value. */
export const noise = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
