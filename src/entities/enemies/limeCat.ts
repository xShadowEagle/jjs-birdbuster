import { GROUND_Y } from '../../constants';
import type { Spot } from './Boss';

/** *At: ms from P2's start; dropAfter: from the cat's second line; smellAfter, comeToAfter: from the orb landing */
export const CAT = {
  from: { sx: -30, y: 6 }, inAt: 300, inMs: 650, popMs: 280, popUp: 22, backMs: 800, perch: { sx: 150, y: 74 },
  wonderAt: 1400, wonderMs: 2400, sayAt: 3900, sayMs: 3300, dropAfter: 1400, dropMs: 420,
  off: { sx: 300, y: -40 }, offMs: 900, smellAfter: 2700, smellMs: 3000, comeToAfter: 1800, shriekMs: 1800,
};
export const BONK_AT = CAT.inAt + CAT.inMs, CAUGHT_AT = BONK_AT + CAT.popMs;
const PERCHED_AT = CAUGHT_AT + CAT.backMs;
export const SAY2_AT = CAT.sayAt + CAT.sayMs + 100, DROP_AT = SAY2_AT + CAT.dropAfter, LANDED_AT = DROP_AT + CAT.dropMs;
export const SMELL_AT = LANDED_AT + CAT.smellAfter, COME_TO_AT = LANDED_AT + CAT.comeToAfter;
export const SHRIEK_AT = SMELL_AT + CAT.smellMs + 100, DONE_AT = SHRIEK_AT + CAT.shriekMs + 100;
export const CHEST = 20;

const lerp = (a: Spot, b: Spot, k: number): Spot => ({ sx: a.sx + (b.sx - a.sx) * k, y: a.y + (b.y - a.y) * k });

/** `t`: ms into P2 */
export function catAt(t: number, head: Spot): Spot {
  if (t < BONK_AT) { const k = (t - CAT.inAt) / CAT.inMs; return lerp(CAT.from, head, k * k); }
  if (t < CAUGHT_AT) return { sx: head.sx - 6, y: head.y - 6 - Math.sin(((t - BONK_AT) / CAT.popMs) * Math.PI) * 6 };
  if (t < PERCHED_AT) { const k = (t - CAUGHT_AT) / CAT.backMs; return lerp({ sx: head.sx - 6, y: head.y - 6 }, CAT.perch, 1 - (1 - k) ** 2); }
  if (t < DROP_AT) return { sx: CAT.perch.sx, y: CAT.perch.y + Math.sin(t / 200) * 3 };
  const k = Math.min(1, (t - DROP_AT) / CAT.offMs);
  return lerp(CAT.perch, CAT.off, k * k);
}

/** `t`: ms into P2 */
export function orbAt(t: number, lime: Spot, head: Spot, cat: Spot | undefined, birdSx: number): Spot {
  if (t < CAUGHT_AT) { const k = (t - BONK_AT) / CAT.popMs; return { sx: lime.sx + (head.sx - 6 - lime.sx) * k, y: lime.y - CAT.popUp * Math.sin(k * Math.PI * 0.5) * 1.6 + (head.y - lime.y) * k * 0.4 }; }
  if (t < DROP_AT) return { sx: cat?.sx ?? 0, y: (cat?.y ?? 0) + 9 };
  const k = Math.min(1, (t - DROP_AT) / CAT.dropMs);
  return lerp({ sx: CAT.perch.sx, y: CAT.perch.y + 9 }, { sx: birdSx, y: GROUND_Y - CHEST }, k * k);
}
