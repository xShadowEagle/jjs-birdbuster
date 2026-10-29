import { RAINBOW } from '../../src/ui/colors.ts';
import type { RivalId } from '../../src/rivals.ts';

export const OUTLINE = 0x2a1a24;

export const JJ = {
  hair: 0xe41770, hairLight: 0xff5aa6, hairDark: 0xa80e52, skin: 0xf7d2b8, skinDark: 0xe0b096, blush: 0xf29a9a,
  eye: 0x3a62d0, eyeDark: 0x22306e, mouth: 0xd05a6a, lips: 0xc8766e,
  jacket: 0x3d3656, jacketLight: 0x575078, jacketDark: 0x2e2942,
  scarf: 0x2f9a92, scarfDark: 0x1f6e6a, glove: 0x6a4630, boot: 0x5a3440, bootLight: 0x7c4a58,
};

export const FLO = {
  skin: 0xf0c8a4, skinDark: 0xd6a482, stubble: 0xd6b294, brow: 0x2a2020, beard: 0x3c302e, beardLight: 0x5a4a44,
  eye: 0x2a1a2a, mouth: 0x6a2a2a, tee: 0xf2ece0, collar: 0xb8ac96,
  jacket: 0x5a3c2a, jacketShade: 0x43291c, lapel: 0x77503a, lapelShade: 0x2c1c12,
  jeans: 0x3a5a9a, jeansDark: 0x2c4678, shoe: 0xe8e8e8, sole: 0xa0a0aa,
};
export const FLO_COLOURS: Record<string, number> = {
  k: FLO.stubble, s: FLO.skin, n: FLO.skinDark, r: FLO.brow, b: FLO.beard, l: FLO.beardLight, e: FLO.eye, w: 0xffffff,
  m: FLO.mouth, t: FLO.tee, c: FLO.collar, j: FLO.jacket, J: FLO.jacketShade, q: FLO.lapel, Q: FLO.lapelShade,
  u: FLO.jeans, U: FLO.jeansDark, o: FLO.shoe, x: FLO.sole,
  // riding: his sleeve and his hand in front of JJ
  A: FLO.jacket, H: FLO.skin,
};

export interface Plumage {
  shine: number; light: number; body: number; shade: number; shade2: number;
  beak: number; beakDark: number; eye: number; eyeDark: number;
  legLight: number; leg: number; legDark: number; claw: number;
}

const LEGS = { legLight: 0x7a5f2e, leg: 0x5f481e, legDark: 0x41301c, claw: 0xdcdcd2 };
export const PLUMAGE = {
  yellow: { shine: 0xfffff0, light: 0xf8f08a, body: 0xf4e05a, shade: 0xe6c63c, shade2: 0xcfa62a, beak: 0xffc21e, beakDark: 0xd8930c, eye: 0x4a64e6, eyeDark: 0x26348c, ...LEGS },
  grey: { shine: 0xf6f6fa, light: 0xdcdce4, body: 0xbcbcc8, shade: 0x9c9cac, shade2: 0x7e7e90, beak: 0xe8b04a, beakDark: 0xb87e24, eye: 0xd8323a, eyeDark: 0x7a1420, ...LEGS },
  teal: { shine: 0xe4fff8, light: 0x86e2d4, body: 0x46c0b4, shade: 0x2e9e96, shade2: 0x207e7a, beak: 0xffc85a, beakDark: 0xd0902a, eye: 0xd8323a, eyeDark: 0x7a1420, ...LEGS },
  lime: { shine: 0xeef8b8, light: 0xbcd456, body: 0x94b034, shade: 0x789426, shade2: 0x5e781c, beak: 0xffc85a, beakDark: 0xd0902a, eye: 0xd8323a, eyeDark: 0x7a1420, ...LEGS },
} satisfies Record<'yellow' | RivalId, Plumage>;

// light, mid and dark husk, its fibres, the eyes
export const COCONUT = { l: 0xb07a48, m: 0x8a5a32, d: 0x5e3a1e, f: 0xc8956a, e: 0x3a2414 };

export const SWORD = { edge: 0xffffff, blade: 0xc4d0e4, spine: 0x8e9cb6, guard: 0xe8b43c, arc: 0xeef8ff, arcEdge: 0xb4d6f0 };

/**
 * The cat's colours by letter: L S D fur (lit, base, shade), T stripes, W white, p pink, k dark, w the eyes' glint,
 * e their blue, 1 2 3 the gem (light to dark), f c F the wing's feathers, coverts and the lines between, q r t its tips.
 */
export const CAT_COLOURS: Record<string, number> = {
  L: 0xc8cedc, S: 0xa2aabc, D: 0x7c8498, T: 0x5a6276, W: 0xf4f6fa, p: 0xf2a0b4, k: 0x2a2430, w: 0xffffff, e: 0x58a8f0,
  1: 0xff9ec0, 2: 0xf0507e, 3: 0xb02858, f: 0xffffff, c: 0xeef0f6, F: 0xb8bcc8, q: 0xf8c4dc, r: 0xd8c4f4, t: 0xbcdcf8,
};

export const DUST = { light: 0xf2e8d0, edge: 0xd9c9a3 };

/** `a`: radians, as Math.atan2 gives them. */
export const rainbowAt = (a: number) => RAINBOW[Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 6];
