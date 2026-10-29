import { seeThrough, type Img, type PixelFn } from './lib/pixels.ts';
import { image, sheet } from './lib/assets.ts';
import { segDist } from './lib/shapes.ts';
import { rainbowAt } from './palette.ts';
import { UI } from '../../src/ui/colors.ts';
import { TOUCH, type ButtonId } from '../../src/constants.ts';
import { SHEETS } from '../../src/assets/manifest.ts';

type Sdf = (x: number, y: number) => number;

const SIZE = 24, MID = SIZE / 2;
const INK = 0x4a3d66, SHADOW = 0x2a2038, GOLD_SHADE = 0xe0a83a;
const ALPHA = { fill: 0.8, ink: 0.6, shadow: 0.35 };
/** BACK: px back per px aside */
const R = 2.2, ARM = 8.5, BACK = 0.8, STEP = 7;

const union = (...fs: Sdf[]): Sdf => (x, y) => Math.min(...fs.map(f => f(x, y)));
const capsule = (ax: number, ay: number, bx: number, by: number, r: number): Sdf => (x, y) => segDist(x, y, ax, ay, bx, by) - r;
const circle = (cx: number, cy: number, r: number): Sdf => (x, y) => Math.hypot(x - cx, y - cy) - r;
const chevron = (ax: number, ay: number, dx: number, dy: number): Sdf => {
  const bx = ax - dx * BACK * ARM, by = ay - dy * BACK * ARM, px = -dy * ARM, py = dx * ARM;
  return union(capsule(ax, ay, bx + px, by + py, R), capsule(ax, ay, bx - px, by - py, R));
};

function icon(shape: Sdf, gold?: Sdf, rainbow = false): PixelFn {
  const inside = (x: number, y: number) => shape(x + 0.5, y + 0.5) < 0;
  return (x, y) => {
    const cx = x + 0.5, cy = y + 0.5;
    if (inside(x, y)) {
      const g = gold !== undefined && gold(cx, cy) < 0;
      const c = shape(cx, cy + 1.6) >= 0 ? (g ? GOLD_SHADE : UI.dim)
        : shape(cx, cy - 1.6) >= 0 && !g ? 0xffffff
        : g ? UI.gold : UI.text;
      return seeThrough(c, rainbow ? 0.95 : ALPHA.fill);
    }
    const near = (dy: number, dxs: number[]) => dxs.some(dx => inside(x + dx, y + dy));
    const a = Math.atan2(cy - MID, cx - MID);
    if (near(-1, [-1, 0, 1]) || near(0, [-1, 1]) || near(1, [-1, 0, 1])) return rainbow ? seeThrough(rainbowAt(a), 0.9) : seeThrough(INK, ALPHA.ink);
    if (rainbow && [-2, -1, 0, 1, 2].some(dy => near(dy, [-2, 2]))) return seeThrough(rainbowAt(a), 0.35);
    if (near(-2, [-1, 0, 1])) return seeThrough(SHADOW, ALPHA.shadow);
    return null;
  };
}

/** Just outside a touch disc's rim. */
const ring = (frame: number): PixelFn => {
  const mid = SHEETS['ui.rainbow_ring'].w / 2, rim = TOUCH.buttonR;
  return (x, y) => {
    const px = x + 0.5 - mid, py = y + 0.5 - mid, r = Math.hypot(px, py), pulse = [0.35, 0.6, 0.85, 1, 0.85, 0.6][frame];
    return r > rim + 0.5 && r < rim + 3.6 ? seeThrough(rainbowAt(Math.atan2(py, px)), pulse * (r > rim + 2.6 ? 0.45 : 0.95)) : null;
  };
};

function shapes(rainbow = false): Record<ButtonId, PixelFn> {
  const span = STEP + BACK * ARM, a0 = MID - span / 2;
  const floor = BACK * ARM + R * 2 + 1.5, top = MID - floor / 2;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4, [L, r] = i % 2 ? [7.5, 1.52] : [9.4, 1.9];
    return capsule(MID, MID, MID + Math.cos(a) * L, MID + Math.sin(a) * L, r);
  });
  return {
    jump: icon(union(chevron(MID, a0, 0, -1), chevron(MID, a0 + STEP, 0, -1)), undefined, rainbow),
    dash: icon(union(chevron(MID + span / 2, MID, 1, 0), chevron(MID + span / 2 - STEP, MID, 1, 0)), undefined, rainbow),
    slide: icon(union(chevron(MID, top + BACK * ARM, 0, 1), capsule(MID - ARM, top + floor, MID + ARM, top + floor, R * 0.9)), undefined, rainbow),
    attack: icon(union(circle(MID, MID, 4), ...rays), circle(MID, MID, 2.4), rainbow),
  };
}

function cleave(rainbow = false): PixelFn {
  const guard = capsule(6.6, 10.6, 13.4, 17.4, 1.4), pommel = circle(4.8, 19.2, 1.9);
  return icon(union(capsule(10, 14, 20, 4, 2), guard, capsule(9, 15, 6, 18, 1.4), pommel), union(guard, pommel), rainbow);
}

export function makeButtonIcons(out: Img[]): void {
  for (const [id, fn] of Object.entries(shapes()) as [ButtonId, PixelFn][]) image(out, `ui.icon_${id}`, SIZE, SIZE, fn);
  image(out, 'ui.icon_cleave', SIZE, SIZE, cleave());
  image(out, 'ui.icon_cleave_rainbow', SIZE, SIZE, cleave(true));
  image(out, 'ui.icon_dash_rainbow', SIZE, SIZE, shapes(true).dash);
  sheet(out, 'ui.rainbow_ring', [0, 1, 2, 3, 4, 5].map(ring));
}
