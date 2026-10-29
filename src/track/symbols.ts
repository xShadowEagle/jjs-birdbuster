import type { ItemId } from '../items';

/** in tiles */
export const blockWidth = (b: Block): number => Math.max(...b.rows.map(r => r.length));

export interface Block {
  name: string;
  /** 1 = first: each tier's blocks play (shuffled) before the next tier's, then all of them mixed */
  tier: number;
  rows: string[];
}

// No Phaser in this file: tools/check-blocks.ts (plain Node) imports it.

export interface SymbolRule {
  what: string;
  /** 1 = just above the ground line; default: any */
  rows?: [min: number, max: number];
  pickup?: ItemId;
  /** only the dash gets past it: two must be far enough apart for the dash to be ready again, also across blocks */
  dashOnly?: boolean;
  /** px/s it comes toward the bird: the dash spacing before it adds what it covers while the dash recharges */
  approach?: number;
  platform?: boolean;
  needsJump?: boolean;
  onGround?: boolean;
}

/** Widest pit ('_') in tiles: a jump's, jump + dash's, and a dash pit's (only a dash from its edge, 5.6 tiles, gets over). */
export const MAX_PIT = { jump: 5, dash: 9, low: 5 };
/** A low overhang (`~`) in this row is just over a standing bird's head: run under it, but no jump. */
export const DASH_PIT_ROW = 3;
/** A dash pit's overhang reaches this many columns before it, so no jump before it gets over. */
export const DASH_PIT_LEAD = 3;

export const bottomRow = (block: Block): string => block.rows[block.rows.length - 1] ?? '';

/** [first column, width] */
export const pits = (block: Block): [number, number][] => [...bottomRow(block).matchAll(/_+/g)].map(m => [m.index, m[0].length]);

/** Pits with a low overhang over them: [first column, width]. */
export function dashPits(block: Block): [number, number][] {
  const low = block.rows[block.rows.length - DASH_PIT_ROW] ?? '';
  return pits(block).filter(([from, len]) => [...low.slice(from, from + len)].includes('~'));
}

export const SYMBOLS = {
  '.': { what: 'nothing' },
  _: { what: 'pit: no ground under this column (see MAX_PIT; not in the first or last 2 columns)', rows: [1, 1] },
  '=': { what: 'one-way platform (its surface is the top of the row)', platform: true },
  F: { what: 'feather', pickup: 'feather', needsJump: true },
  o: { what: 'berry in a bush: the bush grows from the ground below, the berry is at standing height (a slide misses it)', rows: [2, 2], pickup: 'berry', onGround: true },
  f: { what: 'small decor, standing on the ground', rows: [1, 1], onGround: true },
  b: { what: 'large decor, standing on the ground', rows: [1, 1], onGround: true },
  '~': { what: 'low branch: hanging from the top of the screen down to this row (row 2 = slide under; row 3, over a pit: a dash pit, see MAX_PIT)', rows: [2, Infinity] },
  r: { what: 'rogue: creeps in, crouches (the warning) and lunges at head height: slide under it', rows: [1, 1], onGround: true },
  R: { what: 'rogue that throws: stops further off and throws its knife at head height (slide under), then slips away', rows: [1, 1], onGround: true },
  k: { what: 'kaktu: sprints at the bird (peck it, or jump over it); carries the firefly in its belly', rows: [1, 1], onGround: true },
  K: { what: 'kaktu that shoots: stops further off, puffs up and spits needles from its mouth (jump: too low to slide under), then stands (peck it)', rows: [1, 1], onGround: true },
  G: { what: 'big kaktu: as tall as the bird, slower; the first peck knocks it back, the second beats it', rows: [1, 1], onGround: true },
  a: { what: 'archid: drops from the canopy to head height as the bird comes (cleave it for its coconut, or slide under); only its column counts', rows: [1, 1] },
  A: { what: 'archid that swings on its thread: out of reach at the ends of its swing; only its column counts', rows: [1, 1] },
  e: { what: 'fae: floats in at head height, bobbing; pecks and cleaves make it blink away, only the dash catches it (some carry a key)', rows: [2, 2], dashOnly: true, approach: 55 },
  E: { what: 'fae that throws: stops, flashes and throws a spark at the bird, then floats on', rows: [2, 2], dashOnly: true, approach: 55 },
  '|': { what: 'web: a veil of silk from the top of the screen to the ground; cleave or dash through', rows: [1, 1] },
  '#': { what: 'wall: cracked bricks from the top of the screen to the ground; only the dash breaks it', rows: [1, 1], dashOnly: true },
} satisfies Record<string, SymbolRule>;

export type BlockSymbol = keyof typeof SYMBOLS;
export const isBlockSymbol = (ch: string): ch is BlockSymbol => Object.prototype.hasOwnProperty.call(SYMBOLS, ch);
export type PickupSymbol = { [K in BlockSymbol]: (typeof SYMBOLS)[K] extends { pickup: ItemId } ? K : never }[BlockSymbol];
