import { mix, paintSheet, type Img, type PixelFn, type Px } from './lib/pixels.ts';
import { image, sheet } from './lib/assets.ts';
import { beside, ell, fluffy, noise, rell, rfluffy, segDist, tri } from './lib/shapes.ts';
import { ANIMS, BIRD_FRAMES, SHEETS, TEAL_PLUCKED, type SheetKey } from '../../src/assets/manifest.ts';
import { RIVAL_IDS } from '../../src/rivals.ts';
import { SLIDE_HEADROOM } from '../../src/constants.ts';
import { FLO_COLOURS, JJ, OUTLINE, PLUMAGE, SWORD, type Plumage } from './palette.ts';

// The bird's shapes are in units of a 40 px frame.

type Pose = 'idle' | 'run' | 'jump' | 'glide' | 'slide' | 'hurt' | 'peck' | 'cleave' | 'dash' | 'brood' | 'show';
/** bob: units down. tilt, tail (degrees) and eyes only count for brood and show. */
interface Frame {
  pose: Pose; bob: number; phase: number; tilt?: number; eyes?: 'open' | 'shut' | 'sleep'; puff?: number; tail?: number;
  wing?: Feathers; far?: Feathers; held?: boolean; crest?: 'up' | 'swept' | 'low'; open?: boolean; head?: P;
  grip?: number;
  squint?: boolean;
  nest?: boolean;
  cap?: boolean;
  /** [near, far] */
  legs?: [Leg, Leg];
}
type P = [number, number];
/** [degrees up from straight back, length] each, back to front */
type Feathers = [number, number][];
/** heel and ankle: from the hip */
interface Leg { heel: P; ankle: P; planted: boolean }

type Layer = (px: number, py: number) => Px;
const none: Layer = () => null;

const poseFlags = ({ pose, phase }: Frame) => ({
  slide: pose === 'slide', cleave: pose === 'cleave', dash: pose === 'dash', air: pose === 'jump' || pose === 'glide',
  brood: pose === 'brood', show: pose === 'show', windup: pose === 'peck' && phase === 0, strike: pose === 'peck' && phase === 1,
});

/** [swing back, bounce down] */
const HAIR_RUN: P[] = [[0, 0], [0.6, 0.7], [1.1, 0.3], [0.6, -0.4], [0, 0], [-0.3, 0.5]];
const CLEAVE: { hand: P; tip: P }[] = [
  { hand: [1.5, -9.5], tip: [-6.5, -16] },
  { hand: [6.5, -7.5], tip: [18.5, -6.5] },
  { hand: [6.5, -4.5], tip: [16.5, 5] },
];
const DASH_HOLD: { hand: P; tip: P }[] = [{ hand: [5.5, -9.5], tip: [21, -9.5] }, { hand: [5.5, -9.1], tip: [21, -9.1] }];

const wave = (v: number, phase: number) => Math.sin(v * 0.9 + phase * 1.05);

function swordArm(sx: number, sy: number, shoulderY: number, { hand, tip }: { hand: P; tip: P }): Layer {
  const handX = sx + hand[0], handY = sy + hand[1], tx = sx + tip[0], ty = sy + tip[1];
  const len = Math.hypot(tx - handX, ty - handY), dx = (tx - handX) / len, dy = (ty - handY) / len;
  const gx = handX + dx * 1.3, gy = handY + dy * 1.3;
  return (px, py) => {
    if (segDist(px, py, gx - dy * 1.9, gy + dx * 1.9, gx + dy * 1.9, gy - dx * 1.9) < 0.6) return SWORD.guard;
    const d = segDist(px, py, gx, gy, tx, ty);
    if (d < 1.05) {
      const side = (px - gx) * dy - (py - gy) * dx;
      return d < 0.35 ? SWORD.edge : side > 0 ? SWORD.blade : SWORD.spine;
    }
    if (Math.hypot(px - handX, py - handY) < 1.3) return JJ.glove;
    if (segDist(px, py, sx + 1.5, shoulderY + 1.2, handX, handY) < 0.9) return JJ.jacketLight;
    return null;
  };
}

function jjLying(sx: number, sy: number, phase: number): Layer {
  const headX = sx + 6.5, headY = sy - 4.5;
  return (px, py) => {
    if (ell(px, py, headX + 0.7, headY + 0.5, 1.9, 1.9) && px > headX - 0.2 && py > headY - 0.6) {
      const fx = Math.floor(px), fy = Math.floor(py);
      if (fx === Math.floor(headX + 1.2) && fy === Math.floor(headY + 0.2)) return JJ.eye;
      if (fx === Math.floor(headX + 2) && fy === Math.floor(headY + 1.5)) return JJ.blush;
      return JJ.skin;
    }
    const crown = fluffy(px, py, headX - 0.6, headY - 0.8, 3.2, 2.3, 8, 0.14);
    const back = fluffy(px, py, headX - 4, headY + 0.2 - wave(2, phase) * 0.2, 3, 1.6, 6, 0.16);
    const curl = fluffy(px, py, headX - 7.6, headY + 0.6 + wave(3, phase) * 0.3, 1.5, 1.1, 5, 0.2);
    if (crown || back || curl) {
      if (ell(px, py, headX - 1, headY - 2, 1.8, 0.8)) return JJ.hairLight;
      return px < headX - 3 ? JJ.hairDark : JJ.hair;
    }
    if (segDist(px, py, sx + 4.5, sy - 2.5, sx + 8.5, sy - 1) < 0.85) return Math.hypot(px - (sx + 8.5), py - (sy - 1)) < 1.2 ? JJ.glove : JJ.jacketLight;
    if (segDist(px, py, sx + 4, sy - 3.8, sx - 5, sy - 5 + wave(px, phase) * 0.6) < 0.75) return JJ.scarf;
    if (rell(px, py, sx + 1.5, sy - 2, 4.2, 1.7, -18)) return py < sy - 2.6 ? JJ.jacketLight : JJ.jacket;
    const kx = sx - 2.8, ky = sy + 0.6, ax = sx - 5.2, ay = sy + 0.8;
    if (segDist(px, py, ax, ay, ax - 0.6, ay + 1.6) < 0.8) return JJ.boot;
    if (segDist(px, py, kx, ky, ax, ay) < 0.9) return py < ay ? JJ.bootLight : JJ.boot;
    if (segDist(px, py, sx - 0.4, sy - 0.8, kx, ky) < 1.15) return py < sy ? JJ.jacketLight : JJ.jacketDark;
    return null;
  };
}

function jjSeated(sx: number, sy: number, f: Frame, flo: boolean): Layer {
  const { pose, phase, bob } = f, { cleave, dash, air } = poseFlags(f);
  const [swing, bounce] = pose === 'run' ? HAIR_RUN[phase] : dash ? [1.6 + phase * 0.3, -0.6] : air ? [1.3, -0.8] : [0, bob * 0.6];
  const shoulderY = sy - 6.5, headX = sx + 1, headY = sy - 10.5;
  const sword = cleave || dash ? swordArm(sx, sy, shoulderY, (dash ? DASH_HOLD : CLEAVE)[phase]) : none;
  const swordInFront = dash || phase > 0;
  return (px, py) => {
    const swordPx = sword(px, py);
    if (swordPx !== null && swordInFront) return swordPx;
    if (!cleave && !dash && segDist(px, py, sx + 2, shoulderY + 1.5, sx + 7, sy - 2.5) < 0.9) return Math.hypot(px - (sx + 7), py - (sy - 2.5)) < 1.3 ? JJ.glove : JJ.jacketLight;
    if (ell(px, py, headX + 0.8, headY + 0.8, 2.6, 2.6) && px > headX - 0.3 && py > headY - 0.6) {
      const fx = Math.floor(px), fy = Math.floor(py);
      if (fx === Math.floor(headX + 1.2) && fy === Math.floor(headY + 0.4)) return JJ.eye;
      if (fx === Math.floor(headX + 2.2) && fy === Math.floor(headY + 1.8)) return JJ.blush;
      return JJ.skin;
    }
    const crown = fluffy(px, py, headX - 0.6, headY - 1, 4.4, 4, 9, 0.12);
    const back = fluffy(px, py, headX - 3 - swing, headY + 3 + bounce, 2.6, 3.4, 6, 0.18);
    const curl = fluffy(px, py, headX - 5.3 - swing * 1.7, headY + 1.2 + bounce * 1.4, 1.6, 1.3, 5, 0.2);
    if (crown || back || curl) {
      if (ell(px, py, headX - 1.4, headY - 3, 2.2, 1.1) || ell(px, py, headX + 1.6, headY - 2.4, 1.2, 0.8)) return JJ.hairLight;
      if (px < headX - 3.2 - swing || py > headY + 3.5 + bounce) return JJ.hairDark;
      return JJ.hair;
    }
    if (swordPx !== null) return swordPx;
    if (cleave && phase === 1) {
      const ox = sx + 1.5, oy = shoulderY + 1.2, r = Math.hypot(px - ox, py - oy), a = Math.atan2(py - oy, px - ox);
      if (r > 8.2 && r < 11.6 && a > -1.8 && a < -0.1) return r > 10.6 || r < 9 ? SWORD.arcEdge : SWORD.arc;
    }
    if (ell(px, py, sx + 0.8, shoulderY + 0.2, 2.4, 1)) return JJ.scarf;
    if (segDist(px, py, sx - 1.5, shoulderY + 0.5, sx - (flo ? 3.5 : 6.5), shoulderY + 2 + wave(px * 1.2, phase) * 0.8) < 0.75) return JJ.scarfDark;
    if (px >= sx - 2.2 && px < sx + 3 && py >= shoulderY && py < sy + 0.5) return px >= sx + 1.5 ? JJ.jacketLight : px < sx - 1 ? JJ.jacketDark : JJ.jacket;
    const kx = sx + 3, ky = sy + 2.2, ax = sx + 1.8, ay = sy + 5.2;
    if (segDist(px, py, ax, ay, ax + 2.1, ay + 0.6) < 0.85) return JJ.boot;
    if (segDist(px, py, kx, ky, ax, ay) < 0.95) return px > (kx + ax) / 2 + 0.2 ? JJ.bootLight : JJ.boot;
    if (segDist(px, py, sx + 0.3, sy - 0.3, kx, ky) < 1.25) return py < sy + 0.6 ? JJ.jacketLight : JJ.jacketDark;
    return null;
  };
}

/** Letters as in FLO_COLOURS. */
const FLO_PROFILE = [
  '..kkkk..',
  '.kkkkkkk',
  'kkkkkkss',
  'kkkkksrs',
  'kknkkses',
  '.kbbsssss',
  '.kbbbbbm',
  '..bbbbbb',
  '...bbbb.',
];
/** A, H: his arm and hand, in front of JJ. */
const FLO_ASTRIDE = [
  '...jjjjc',
  '..jjjjjtj',
  '..Jjjjjtj',
  '..Jjjjjtjj',
  '..Jjjjjt.jjA',
  '..Jjjjjt...AAH',
  '..Jjjjjj',
  '..Jjjjjj',
  '..JJjjjj',
  '...uuuuuuuu',
  '....UUuuuuu',
  '.........uu',
  '.........uu',
  '.........uU',
  '.........ooo',
  '.........xxx',
];

function floRiding(sx: number, sy: number, { pose, phase }: Frame): { front: Layer; back: Layer } {
  const x0 = Math.round(sx) - 15, y0 = Math.round(sy) - 16;
  const swing = pose === 'run' ? [0, 1, 1, 0, -1, -1][phase] : 0;
  const at = (px: number, py: number): string => {
    const x = Math.floor(px) - x0, y = Math.floor(py) - y0;
    if (y < FLO_PROFILE.length) return FLO_PROFILE[y]?.[x] ?? '.';
    const row = y - FLO_PROFILE.length;
    return FLO_ASTRIDE[row]?.[x - (row >= FLO_ASTRIDE.length - 5 ? swing : 0)] ?? '.';      // the shin and the sneaker swing
  };
  const colour = (c: string): Px => (c === '.' ? null : FLO_COLOURS[c]);
  return {
    front: (px, py) => { const c = at(px, py); return c === 'A' || c === 'H' ? colour(c) : null; },
    back: (px, py) => { const c = at(px, py); return c === 'A' || c === 'H' ? null : colour(c); },
  };
}

const RUN: Leg[] = [
  { heel: [-1, 4.5], ankle: [5, 9.5], planted: true },
  { heel: [-2, 5], ankle: [2.5, 10], planted: true },
  { heel: [-3, 5], ankle: [-1, 10], planted: true },
  { heel: [-4.5, 4.5], ankle: [-5.5, 8.5], planted: false },
  { heel: [-3, 3], ankle: [-6, 5.5], planted: false },
  { heel: [0.5, 3], ankle: [3.5, 6.5], planted: false },
];
const STAND: Leg = { heel: [-2, 5], ankle: [0.5, 10], planted: true };
const TUCK: Leg = { heel: [1, 3], ankle: [-1.5, 5.5], planted: false };
const TRAIL: Leg = { heel: [-3, 3], ankle: [-7, 4.5], planted: false };
const BRACE: [Leg, Leg] = [{ heel: [-1, 4.5], ankle: [4, 9.5], planted: true }, { heel: [-3.5, 5], ankle: [-3.5, 10], planted: true }];
/** [near, far] */
const CROUCH: [Leg, Leg][] = [
  [{ heel: [-2.5, 2.5], ankle: [4, 4.8], planted: true }, { heel: [-3.5, 2], ankle: [-4.5, 3.6], planted: false }],
  [{ heel: [-3.5, 2], ankle: [-4.5, 3.6], planted: false }, { heel: [-2.5, 2.5], ankle: [4, 4.8], planted: true }],
];

function birdLeg(f: Frame, C: Plumage, cx: number, cy: number, near: boolean): Layer {
  const { pose, phase, legs } = f, { slide, cleave, dash, brood, show, strike } = poseFlags(f);
  if (brood) return none;
  const { heel, ankle, planted } = legs ? legs[near ? 0 : 1] : pose === 'run' ? RUN[(phase + (near ? 0 : 3)) % 6]
    : slide ? CROUCH[phase ? 1 : 0][near ? 0 : 1]
    : pose === 'jump' ? TUCK : pose === 'glide' || dash || show ? TRAIL : strike || cleave ? BRACE[near ? 0 : 1] : STAND;
  const hipX = cx + (near ? 2 : -2), hipY = cy + (slide ? 3 : 4) + (near ? 0 : -0.5);
  const kx = hipX + heel[0], ky = hipY + heel[1], ax = hipX + ankle[0], ay = hipY + ankle[1];
  const dark = near ? C.leg : C.legDark;
  const toes = planted ? [[4, 0.9], [2.6, 1.3], [-2, 0.9]] : [[2, 2.6], [0.4, 3], [-2.2, 1.4]];
  return (px, py) => {
    if (segDist(px, py, hipX, hipY, kx, ky) < 1.35) return near && px > (hipX + kx) / 2 ? C.legLight : dark;
    if (segDist(px, py, kx, ky, ax, ay) < 0.75) return dark;
    for (const [dx, dy] of toes) {
      if (segDist(px, py, ax, ay, ax + dx, ay + dy) < 0.7) return Math.hypot(px - (ax + dx), py - (ay + dy)) < 0.9 ? C.claw : dark;
    }
    return null;
  };
}

const GLIDE_WING: Feathers[] = [
  [[38, 12], [25, 15], [12, 16], [-1, 14]],
  [[8, 12], [-6, 15], [-20, 16], [-34, 14]],
];
const featherAt = (feathers: Feathers, ox: number, oy: number, px: number, py: number): number => {
  for (let i = feathers.length - 1; i >= 0; i--) {
    const [a, len] = feathers[i], r = (a * Math.PI) / 180, dx = -Math.cos(r), dy = -Math.sin(r);
    if (rell(px, py, ox + (dx * len) / 2, oy + (dy * len) / 2, len / 2, 1.7, (Math.atan2(dy, dx) * 180) / Math.PI)) return i;
  }
  return -1;
};

function wings({ pose, phase, wing, far, held, grip = 3 }: Frame, C: Plumage, cx: number, cy: number, plucked: number): Record<'spread' | 'folded' | 'far' | 'held', Layer> {
  const rim = mix(C.shade2, OUTLINE, 0.45);
  const remaining = (fs: Feathers): Feathers => {
    const gone = plucked >= 3 ? [0, 2] : plucked >= 2 ? [1] : [];
    return fs.filter((_, i) => !gone.includes(i)).map(([a, len]) => [a, len * (plucked >= 3 ? 0.8 : 1)]);
  };
  const fan = (fs: Feathers, ox: number, oy: number, lit: number, plain: number): Layer => (px, py) => {
    const i = featherAt(fs, ox, oy, px, py);
    if (i < 0) return null;
    if (featherAt(fs, ox, oy, px, py + 1) !== i) return C.shade2;
    if (featherAt(fs, ox, oy, px, py - 1) !== i) return lit;
    return i % 2 ? plain : lit;
  };

  const wx = cx + 2.5, wy = cy - 1;
  const isSpread = pose === 'glide' || !!wing, feathers = remaining(wing ?? (isSpread ? GLIDE_WING[phase] : []));
  const arm = (qx: number, qy: number) => rell(qx, qy, wx - 3, wy - 0.5, 4.6, 2.6, -8);
  const inWing = (qx: number, qy: number) => arm(qx, qy) || featherAt(feathers, wx, wy, qx, qy) >= 0;
  const nearFan = fan(feathers, wx, wy, C.light, C.body);
  const spread: Layer = (px, py) => {
    if (!inWing(px, py)) return beside(inWing, px, py) ? rim : null;
    if (arm(px, py)) return !arm(px, py - 1) ? C.light : !arm(px, py + 1) ? C.shade : C.body;
    return nearFan(px, py);
  };

  const inFolded = (qx: number, qy: number) => rell(qx, qy, cx - 1, cy - 0.2, 5.8, 3, -10)
    || tri(qx, qy, [cx - 5, cy - 1.5], [cx - 3.5, cy + 2.5], [cx - 10, cy + 2])
    || tri(qx, qy, [cx - 3.5, cy + 1], [cx - 0.5, cy + 2.8], [cx - 7.5, cy + 4.5]);
  const folded: Layer = (px, py) => (!inFolded(px, py) ? null : !inFolded(px, py + 1) ? C.shade2 : !inFolded(px, py - 1) ? C.light : C.shade);

  const heldFeather = (): Layer => {
    const [a, len] = feathers[feathers.length - 1], r = (a * Math.PI) / 180, dx = -Math.cos(r), dy = -Math.sin(r);
    const mx = wx + dx * (len + grip), my = wy + dy * (len + grip), deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const inside = (qx: number, qy: number) => rell(qx, qy, mx, my, 4.2, 1.5, deg);
    return (px, py) => {
      if (!inside(px, py)) return beside(inside, px, py) ? rim : null;
      return segDist(px, py, mx - dx * 4, my - dy * 4, mx + dx * 3.5, my + dy * 3.5) < 0.45 ? C.shade : C.shine;
    };
  };
  return {
    spread: isSpread ? spread : none,
    folded: isSpread ? none : folded,
    far: far ? fan(remaining(far), wx - 2.5, wy - 1.5, C.body, C.shade) : none,
    held: held && wing ? heldFeather() : none,
  };
}

/** [dx, dy, rx, ry, degrees up from straight back], from the body's centre */
const PLUMES: [number, number, number, number, number][] = [[-8.5, -6.5, 5.2, 2.4, 58], [-10, -3, 4.8, 2.3, 32], [-10, 0.5, 4, 2, 10]];
/** the tail's extra degrees up */
const TAIL_RUN = [0, 5, 8, 5, 0, -4];
/** [root, tip], from the body's centre */
const RUFFLES: [P, P][] = [[[-3, -5], [-5.5, -9.5]], [[6.5, 2.5], [10, 4.5]], [[-1, 5.5], [-2.5, 9.5]]];

/** Triangles from the head's centre; the crest's spikes [base, base, tip] each. */
const BEAK: Record<'open' | 'hurt' | 'shut', P[][]> = {
  open: [[[3.2, -1.4], [9.6, 1.2], [3.6, 2]], [[3.6, 2], [8, 2], [3.4, 3.6]]],
  hurt: [[[3.4, -1.2], [8.5, 0], [3.6, 1]], [[3.6, 2], [7.2, 3.6], [3.4, 3.2]]],
  shut: [[[3.3, -0.9], [8.4, 1.3], [3.6, 1.8]], [[3.6, 1.8], [7, 1.8], [3.4, 3]]],
};
const CREST: Record<'low' | 'flat' | 'up' | 'swept' | 'plain', P[][]> = {
  low: [[[-3.8, -1], [-2, -3.4], [-9.5, -3]], [[-2.6, -3.2], [-0.4, -4.2], [-7, -5.8]], [[-0.6, -4], [1.4, -3.8], [-3.5, -6]]],
  flat: [[[-3, -1], [-1, -3], [-8.5, -2.5]], [[-1.5, -3], [0.5, -3.8], [-7, -4.4]]],
  up: [[[-3.6, -1.5], [-2, -3.6], [-7, -7.5]], [[-2.4, -3.4], [-0.4, -4.4], [-3.5, -9.2]], [[-0.4, -4.2], [1.4, -3.8], [0.8, -8.6]]],
  swept: [[[-3.8, -1], [-2, -3.4], [-9, -4]], [[-2.6, -3.2], [-0.4, -4.2], [-6.5, -7.5]], [[-0.6, -4], [1.4, -3.8], [-3, -7.6]]],
  plain: [[[-3.8, -1], [-2, -3.4], [-8.5, -5.5]], [[-2.6, -3.2], [-0.4, -4.2], [-5, -9.5]], [[-0.6, -4], [1.4, -3.8], [-1, -8.5]]],
};
const inTri = (px: number, py: number, [a, b, c]: P[]) => tri(px, py, a, b, c);

/** plucked: 0 (not) to 3 (bald) */
interface Extras { rider?: boolean; flo?: boolean; plucked?: number }

function frame(f: Frame, C: Plumage, { rider = false, flo = false, plucked = 0 }: Extras): (px: number, py: number, x: number, y: number) => Px {
  const { pose, bob, phase, eyes = 'open', puff = 0, tail = -4, open, head: headShift = [0, 0], squint = false } = f;
  const { slide, cleave, dash, air, brood, show, windup, strike } = poseFlags(f);
  const cx = strike ? 16 : 16.5, cy = (brood ? 31 : slide ? 30 : dash ? 23 : 24) + bob;
  const brx = brood ? 10.5 : 9.5, bry = brood ? 6.3 + puff : slide ? 5.8 : 6;
  const tilt = brood || show ? f.tilt ?? 0 : slide ? 8 : strike ? 7 : dash ? 5 : cleave ? 4 : windup ? -10 : -6;
  const [hx, hy] = brood ? [cx + 9.5 + headShift[0], cy - 12 + headShift[1]]
    : slide ? [cx + 12.5, cy - 3.5]
    : windup ? [cx + 9.5, cy - 13]
    : dash ? [cx + 13.5, cy - 6]
    : strike ? [cx + 12, cy - 4.5]
    : cleave ? [cx + 13, cy - 6.5 + (phase === 2 ? 0.8 : 0)]
    : [cx + 11.5 + headShift[0], cy - 11 + headShift[1]];

  const lean = strike ? 1 : dash ? 1.2 : cleave ? [-0.6, 0.8, 1.2][phase] : 0;
  const sx = cx - 1.5 + lean + (flo ? 1 : 0), sy = slide ? cy - 2.8 : cy - 5.5;
  const rear = flo ? 1.5 : 0;
  const jj = !rider ? none : slide ? jjLying(sx, sy, phase) : jjSeated(sx, sy, f, flo);
  const passenger = flo ? floRiding(sx, sy, f) : { front: none, back: none };
  const wing = wings(f, C, cx, cy, plucked);
  const nearLeg = birdLeg(f, C, cx, cy, true), farLeg = birdLeg(f, C, cx, cy, false);

  const fromHead = (shape: P[]) => shape.map(([dx, dy]): P => [hx + dx, hy + dy]);
  const [beak, beakUnder] = BEAK[windup || strike || open ? 'open' : pose === 'hurt' ? 'hurt' : 'shut'].map(fromHead);
  const crest = CREST[dash || slide || f.crest === 'low' ? 'low' : cleave ? 'flat' : windup || f.crest === 'up' ? 'up' : strike || f.crest === 'swept' ? 'swept' : 'plain'].map(fromHead);
  const stub = ([a, b, tip]: P[]): P[] => [a, b, [a[0] + (tip[0] - a[0]) * 0.3, a[1] + (tip[1] - a[1]) * 0.3]];
  const spikes = f.cap ? [] : plucked >= 3 ? crest.map(stub) : plucked >= 2 ? crest.slice(1) : crest;
  const neckX = cx + 6, neckY = cy - 1.5;
  const headAndNeck: Layer = (px, py) => {
    if (inTri(px, py, beak)) return C.beak;
    if (inTri(px, py, beakUnder)) return C.beakDark;
    if (pose === 'hurt' || squint) {
      if (segDist(px, py, hx + 0.4, hy - 2, hx + 2.4, hy - 0.8) < 0.6 || segDist(px, py, hx + 2.4, hy - 0.8, hx + 0.6, hy + 0.2) < 0.6) return OUTLINE;
    } else if ((brood || show) && eyes === 'shut') {
      if (segDist(px, py, hx + 0.2, hy - 0.9, hx + 1.2, hy - 1.9) < 0.55 || segDist(px, py, hx + 1.2, hy - 1.9, hx + 2.2, hy - 0.9) < 0.55) return OUTLINE;
    } else if ((brood || show) && eyes === 'sleep') {
      if (segDist(px, py, hx, hy - 1.8, hx + 1.2, hy - 1.1) < 0.55 || segDist(px, py, hx + 1.2, hy - 1.1, hx + 2.4, hy - 1.6) < 0.55) return OUTLINE;
    } else {
      const ex = Math.round(hx + 1), ey = Math.round(hy - 2), fx = Math.floor(px), fy = Math.floor(py);
      if (fx >= ex && fx <= ex + 1 && fy >= ey && fy <= ey + 2) {
        if (fx === ex && fy === ey) return C.shine;
        return fy === ey + 2 ? C.eyeDark : C.eye;
      }
    }
    for (const spike of spikes) if (inTri(px, py, spike)) return plucked < 3 && py < (spike[0][1] + spike[2][1]) / 2 ? C.light : C.body;
    if (ell(px, py, hx, hy, 4.8, 4.4)) {
      if (ell(px, py, hx - 1, hy - 2, 3, 1.8)) return C.light;
      return py > hy + 2 ? C.shade : C.body;
    }
    if (segDist(px, py, neckX, neckY, hx - 1.2, hy + 2) < 3) {
      const side = (px - neckX) * (hy + 2 - neckY) - (py - neckY) * (hx - 1 - neckX);
      return side < -3 ? C.light : C.body;
    }
    return null;
  };

  const ruffles = RUFFLES.slice(0, plucked);
  const pluckedSpots: Layer = (px, py) => {
    for (const [[rx, ry], [tx, ty]] of ruffles) if (segDist(px, py, cx + rx, cy + ry, cx + tx, cy + ty) < 0.7) return C.light;
    return null;
  };

  const chestAndBody = (px: number, py: number, x: number, y: number): Px => {
    if (brood ? fluffy(px, py, cx + 5.5, cy - 0.5, 4.6 + puff, 5.6 + puff, 7, 0.16) : fluffy(px, py, cx + 5, cy + 0.5, 4 + puff, 5 + puff, 6, 0.12)) return py > cy + 3.5 + (brood ? 0 : puff) ? C.shade : C.light;
    if (!rell(px, py, cx - rear, cy, brx + rear, bry, tilt)) return null;
    if (ell(px, py, cx - 2, cy - 3.5, 4.5, 2)) return C.light;
    const t = (py - (cy - bry)) / (2 * bry), checker = (x + y) % 2 === 0;     // t: 0 top to 1 bottom
    if (t > 0.9 || (t > 0.84 && checker)) return C.shade2;
    if (t > 0.7 || (t > 0.62 && checker)) return C.shade;
    return C.body;
  };

  const sway = (flo ? -14 : 0) + (brood || show ? tail : pose === 'run' ? TAIL_RUN[phase] : air ? 10 : slide ? -10 + phase : dash ? -14 : strike ? 12 : windup ? -6 : cleave ? [0, 8, 10][phase] : bob * 3);
  const plumes = PLUMES.filter((_, i) => i >= Math.min(plucked, 2)).map(([dx, dy, rx, ry, deg]) => [dx, dy, plucked >= 3 ? rx * 0.6 : rx, ry, deg]);
  const plumeAt = (qx: number, qy: number) => plumes.findIndex(([dx, dy, rx, ry, deg]) => rfluffy(qx, qy, cx + dx - rear * 2, cy + dy + (slide ? 2 : 0), rx, ry, deg + sway, 6, 0.14));
  const tailPlumes: Layer = (px, py) => {
    const i = plumeAt(px, py);
    if (i < 0) return null;
    if (plumeAt(px, py + 1) !== i) return C.shade2;
    if (plumeAt(px, py - 1) < 0) return C.light;
    return i % 2 ? C.light : C.body;
  };

  const nest = f.nest ? nestFront(cx - 1, cy + 2.5) : none;
  const cap = f.cap ? nightcap(hx, hy) : none;

  // front to back
  return (px, py, x, y) => wing.held(px, py) ?? wing.spread(px, py) ?? passenger.front(px, py) ?? jj(px, py) ?? passenger.back(px, py)
    ?? nest(px, py) ?? cap(px, py) ?? headAndNeck(px, py) ?? nearLeg(px, py) ?? wing.folded(px, py) ?? pluckedSpots(px, py) ?? chestAndBody(px, py, x, y)
    ?? tailPlumes(px, py) ?? wing.far(px, py) ?? farLeg(px, py);
}

const NEST = { dark: 0x3a2618, twig: 0x5e3e24, mid: 0x7a5230, light: 0x9a6a3c };
const CAP = { light: 0x8aa4ff, body: 0x5a7ae6, shade: 0x3a50b0, trim: 0xf6f6fa, trimShade: 0xcacad4 };

/** The nest's front half, its rim at (x, y); the bird sits in it. */
function nestFront(x: number, y: number): Layer {
  const RX = 13.5, DEEP = 7;
  const inBowl = (px: number, py: number) => py >= y - 0.5 && ell(px, py, x, y, RX, DEEP);
  return (px, py) => {
    if (!inBowl(px, py)) return null;
    const fx = Math.floor(px), fy = Math.floor(py);
    if (!inBowl(px, py - 1)) return noise(fx, 31) > 0.6 ? NEST.light : NEST.mid;
    if (!inBowl(px, py - 2)) return noise(fx, 32) > 0.6 ? NEST.mid : NEST.twig;
    const a = Math.floor((fx + fy * 1.6 + noise(Math.floor(fx / 3), 7) * 3) / 3) % 3, b = Math.floor((fx - fy * 1.4 + 200) / 4) % 3;
    const c = a === 0 ? (b === 0 ? NEST.dark : NEST.twig) : b === 0 ? NEST.mid : NEST.light;
    return !inBowl(px, py + 2) ? (c === NEST.light ? NEST.mid : NEST.dark) : c;
  };
}

/** Flopping back from the crown of the head at (hx, hy), a pompom on the tip. */
function nightcap(hx: number, hy: number): Layer {
  const a: P = [hx - 0.5, hy - 7], ctrl: P = [hx - 5, hy - 12], tip: P = [hx - 9.5, hy - 5];
  const at = (t: number): P => [0, 1].map(i => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * ctrl[i] + t * t * tip[i]) as P;
  const inCone = (px: number, py: number) => {
    for (let t = 0; t <= 1; t += 0.04) {
      const [qx, qy] = at(t);
      if (Math.hypot(px - qx, py - qy) < 3 * (1 - t) + 0.7) return true;
    }
    return false;
  };
  return (px, py) => {
    if (Math.hypot(px - tip[0], py - tip[1]) < 1.9) return py > tip[1] + 0.5 ? CAP.trimShade : CAP.trim;
    if (rell(px, py, hx - 0.6, hy - 5, 5, 1.2, -12)) return py > hy - 4.8 ? CAP.trimShade : CAP.trim;
    if (!inCone(px, py) || (py > hy - 5 && px > hx - 5.5)) return null;                  // nothing under the brim: the eye shows
    return !inCone(px, py - 1) ? CAP.light : !inCone(px, py + 1) ? CAP.shade : CAP.body;
  };
}

const FRAMES: Frame[] = [
  { pose: 'idle', bob: 0, phase: 0 }, { pose: 'idle', bob: 1, phase: 3 },
  ...[0, 1, 2, 3, 4, 5].map(p => ({ pose: 'run' as const, bob: p % 3 === 1 ? 1 : 0, phase: p })),
  { pose: 'jump', bob: 0, phase: 1 }, { pose: 'jump', bob: -1, phase: 2 },
  { pose: 'glide', bob: 0, phase: 0 }, { pose: 'glide', bob: 0, phase: 1 },
  { pose: 'slide', bob: 0, phase: 0 }, { pose: 'slide', bob: 0, phase: 3 },
  { pose: 'hurt', bob: 0, phase: 0 },
  { pose: 'peck', bob: 0, phase: 0 }, { pose: 'peck', bob: 0, phase: 1 },
  { pose: 'cleave', bob: 0, phase: 0 }, { pose: 'cleave', bob: 0, phase: 1 }, { pose: 'cleave', bob: 0, phase: 2 },
  { pose: 'dash', bob: 0, phase: 0 }, { pose: 'dash', bob: 0, phase: 1 },
];

const BROOD: Frame[] = [
  { pose: 'brood', bob: 0, phase: 0, eyes: 'shut', puff: 0.4, tail: 12 },
  { pose: 'brood', bob: 0, phase: 0, eyes: 'shut', puff: 1, tail: 16 },
];

const SHOW = { pose: 'show', bob: 0, phase: 0 } as const;
const LIME_SHOW: Frame[] = [
  { ...SHOW, tilt: -4, head: [-0.5, 0], crest: 'up', tail: 10, wing: [[-40, 10], [-28, 12], [-16, 13], [-4, 12]] },
  { ...SHOW, tilt: 8, head: [1.5, 2], crest: 'swept', open: true, tail: 20, wing: [[250, 12], [237, 15], [224, 16], [211, 14]], far: [[50, 12], [64, 15], [78, 16], [92, 14]] },
  { ...SHOW, tilt: 4, head: [1.5, 0.5], crest: 'swept', open: true, tail: 20, wing: [[150, 12], [162, 15], [174, 16], [186, 15]], far: [[50, 12], [64, 15], [78, 16], [92, 14]] },
];

const DAZED = { ...SHOW, squint: true, crest: 'low', open: true } as const;
const LIME_DAZED: Frame[] = [
  { ...DAZED, tilt: -12, head: [-2, 2], tail: 20, wing: [[56, 12], [69, 15], [82, 16], [95, 14]], far: [[-30, 12], [-42, 15], [-54, 16], [-66, 14]] },
  { ...DAZED, tilt: -4, head: [0, 1], tail: 8, wing: [[30, 12], [40, 15], [50, 16], [60, 14]], far: [[20, 12], [30, 15], [40, 16], [50, 14]] },
  { ...DAZED, tilt: 10, head: [2, 3], tail: -6, wing: [[-20, 12], [-34, 15], [-48, 16], [-62, 14]], far: [[120, 12], [132, 15], [144, 16], [156, 14]] },
  { ...DAZED, tilt: 2, head: [0, 1], tail: 8, wing: [[50, 12], [60, 15], [70, 16], [80, 14]], far: [[40, 12], [50, 15], [60, 16], [70, 14]] },
];

const TEAL_SHOW: Frame[] = [
  { ...SHOW, tilt: 0, head: [0.5, 0.5], tail: 4, wing: [[-28, 7], [-20, 8], [-12, 9], [-4, 8]], held: true, grip: 0.5 },
  { ...SHOW, tilt: -4, crest: 'up', tail: 8, wing: [[-40, 10], [-28, 12], [-16, 13], [-4, 12]], held: true, grip: 1 },
  { ...SHOW, tilt: 6, head: [1, 1.5], crest: 'swept', open: true, tail: 2, wing: [[150, 12], [165, 15], [180, 16], [195, 15]] },
  { ...SHOW, tilt: 16, head: [1, 5], crest: 'low', tail: 24, wing: [[250, 12], [236, 15], [222, 16], [208, 14]] },
  { ...SHOW, tilt: -4, head: [-0.5, -2], crest: 'up', puff: 0.8, tail: 14, wing: [[120, 12], [138, 15], [156, 16], [174, 14]] },
];

const GROAN: Omit<Frame, 'bob'> = { pose: 'idle', phase: 0, squint: true, open: true, crest: 'low', head: [0.5, 2.5] };
const bent = (dy: number): [Leg, Leg] => [{ heel: [-3, 4], ankle: [0.5, dy], planted: true }, { heel: [-3.5, 4], ankle: [-0.5, dy], planted: true }];
const GROANS: Frame[] = [{ ...GROAN, bob: 3, legs: bent(7) }, { ...GROAN, bob: 2, legs: bent(8) }];
/** The frame order is PAIR_FRAMES (the manifest). */
const PAIR: Frame[] = [...FRAMES.slice(BIRD_FRAMES.idle[0], BIRD_FRAMES.run[1] + 1), ...GROANS];

/** Puffed up per frame: one slow breath. */
const BREATH = [0.3, 0.5, 0.8, 1, 1, 0.8, 0.5, 0.3];

/** Bobo asleep in a nest, 40x40 frames: one breath. */
export function napping(): Img {
  return paintSheet([], 'napping', 40, 40, BREATH.map((puff): PixelFn => {
    const nap: Frame = { pose: 'brood', bob: -2, phase: 0, eyes: 'sleep', puff, head: [0.5, 1], tail: 12 + puff * 4, nest: true, cap: true };
    const fn = frame(nap, PLUMAGE.yellow, {});
    return (x, y) => fn(x + 0.5, y + 0.5, x, y);
  }), OUTLINE);
}

function birdSheet(out: Img[], key: SheetKey, look: Plumage, frames: Frame[], extras: Extras = {}): Img {
  const { w, h } = SHEETS[key], k = h / 40, dx = (w - h) / (2 * k);
  return sheet(out, key, frames.map((f): PixelFn => {
    const fn = frame(f, look, extras);
    return (x, y) => fn((x + 0.5) / k - dx, (y + 0.5) / k, x, y);
  }), OUTLINE);
}

/** The right half from x 12 out, mirrored. l lit, b body. */
const PORTRAIT_CREST = ['l.........', 'll..l.....', 'll.ll.....', 'lb.lb..l..', 'bb.bb.lb..', 'bbbbbbb...'];

function birdPortrait(C: Plumage): PixelFn {
  const cx = 12, hy = 11.5;                                // cx on a pixel edge
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5, dx = Math.abs(px - cx);
    if (tri(dx, py, [0, 11.2], [3.4, 12.6], [0, 17])) return C.beak;
    if (tri(dx, py, [0, 14.6], [2.6, 13.6], [0, 18.2])) return C.beakDark;
    for (const x0 of [15, 6]) {
      if (x >= x0 && x < x0 + 3 && y >= 9 && y < 12) return x === x0 && y === 9 ? C.shine : y === 11 ? C.eyeDark : C.eye;
    }
    const c = PORTRAIT_CREST[y]?.[Math.floor(cx + dx) - 12] ?? '.';
    if (c !== '.' && !ell(px, py, cx, hy, 7.2, 6.6)) return c === 'l' ? C.light : C.body;
    if (fluffy(cx + dx, py, cx, hy, 7.4, 6.8, 14, 0.06, Math.PI / 2)) {
      if (ell(px, py, cx, hy - 3.6, 4.6, 2.4)) return C.light;
      return py > hy + 4 && dx > 3 ? C.shade : C.body;
    }
    const w = 4 + Math.max(0, py - 18.5) * 0.9 + (py > 19 ? Math.cos(dx * 2.2) * 0.4 : 0);
    if (dx < w && py > hy + 4) return dx < 2.2 + Math.max(0, py - 19) * 0.4 ? C.light : dx > w - 1.4 && py > 19 ? C.shade : C.body;
    return null;
  };
}

function checkLayout(): void {
  for (const [pose, [from, to]] of Object.entries(BIRD_FRAMES)) {
    for (let i = from; i <= to; i++) if (FRAMES[i]?.pose !== pose) throw new Error(`bird frame ${i} is ${FRAMES[i]?.pose}, but the game plays it as ${pose} (BIRD_FRAMES)`);
  }
  const count = Math.max(...Object.values(BIRD_FRAMES).map(([, to]) => to)) + 1;
  if (FRAMES.length !== count) throw new Error(`bird.ts draws ${FRAMES.length} frames, BIRD_FRAMES uses ${count}`);
  const posed = (p: 'idle' | 'run') => FRAMES.slice(BIRD_FRAMES[p][0], BIRD_FRAMES[p][1] + 1);
  const pairPlays: Record<string, Frame[]> = { pair_idle: posed('idle'), pair_run: posed('run'), pair_groan: GROANS };
  const onPair = Object.entries(ANIMS).filter(([, a]) => a.sheet === 'char.bird_pair');
  for (const [key, a] of onPair) {
    const want = pairPlays[key] ?? [];
    if (a.frames.length !== want.length || a.frames.some((n, i) => PAIR[n] !== want[i])) throw new Error(`anim '${key}' plays char.bird_pair frames ${a.frames.join(', ')}, which PAIR in bird.ts doesn't draw as ${key} (PAIR_FRAMES)`);
  }
  const pairCount = Math.max(...onPair.flatMap(([, a]) => a.frames)) + 1;
  if (PAIR.length !== pairCount) throw new Error(`bird.ts draws ${PAIR.length} pair frames, the pair anims use ${pairCount}`);
}

function checkSlide(img: Img): void {
  const fw = SHEETS['char.bird'].w;
  for (let f = BIRD_FRAMES.slide[0]; f <= BIRD_FRAMES.slide[1]; f++) {
    let top = 0;
    while (top < img.h && !Array.from({ length: fw }, (_, x) => img.px[top * img.w + f * fw + x]).some(c => c !== null)) top++;
    if (img.h - top > SLIDE_HEADROOM) throw new Error(`bird slide frame ${f} is ${img.h - top} px tall, more than SLIDE_HEADROOM (${SLIDE_HEADROOM})`);
  }
}

export function makeBird(out: Img[]): void {
  checkLayout();
  checkSlide(birdSheet(out, 'char.bird', PLUMAGE.yellow, FRAMES, { rider: true }));
  birdSheet(out, 'char.bird_solo', PLUMAGE.yellow, FRAMES);
  birdSheet(out, 'char.bird_pair', PLUMAGE.yellow, PAIR, { rider: true, flo: true });
  image(out, 'portrait.bird', 24, 24, birdPortrait(PLUMAGE.yellow), OUTLINE);
  for (const r of RIVAL_IDS) {
    birdSheet(out, `char.rival_${r}`, PLUMAGE[r], FRAMES);
    birdSheet(out, `char.boss_${r}`, PLUMAGE[r], FRAMES);
    birdSheet(out, `char.rival_${r}_brood`, PLUMAGE[r], BROOD);
    image(out, `portrait.${r}`, 24, 24, birdPortrait(PLUMAGE[r]), OUTLINE);
  }
  birdSheet(out, 'char.boss_teal_show', PLUMAGE.teal, TEAL_SHOW);
  birdSheet(out, 'char.boss_lime_show', PLUMAGE.lime, LIME_SHOW);
  birdSheet(out, 'char.boss_lime_dazed', PLUMAGE.lime, LIME_DAZED);
  const bald = { plucked: TEAL_PLUCKED[TEAL_PLUCKED.length - 1] };
  birdSheet(out, 'char.rival_teal_plucked', PLUMAGE.teal, FRAMES, bald);
  birdSheet(out, 'char.rival_teal_plucked_brood', PLUMAGE.teal, BROOD, bald);
  for (const plucked of TEAL_PLUCKED) {
    birdSheet(out, `char.boss_teal_plucked_${plucked}`, PLUMAGE.teal, FRAMES, { plucked });
    birdSheet(out, `char.boss_teal_show_plucked_${plucked}`, PLUMAGE.teal, TEAL_SHOW, { plucked });
  }
}
