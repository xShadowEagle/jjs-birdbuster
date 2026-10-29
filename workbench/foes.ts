import type Phaser from 'phaser';
import { GROUND_Y, TILE } from '../src/constants';
import { TEAL_PLUCKED } from '../src/assets/manifest';
import { ENEMY_SYMBOLS, type EnemySymbol } from '../src/entities/Enemies';
import type { Arena, Attack } from '../src/entities/enemies/Enemy';
import Barrier from '../src/entities/enemies/Barrier';
import type Boss from '../src/entities/enemies/Boss';
import { makeBoss } from '../src/entities/enemies/bosses';
import { GREY_MOVES, type GreyMove } from '../src/entities/enemies/Grey';
import { TEAL_MOVES, type TealMove } from '../src/entities/enemies/Teal';
import { LIME_MOVES, type LimeMove } from '../src/entities/enemies/Lime';
import { LEVELS } from '../src/levels';
import { RIVAL_IDS, type RivalId } from '../src/rivals';
import { CHARACTERS } from '../src/story/characters';
import { EN } from '../src/texts/en';
import { SYMBOLS } from '../src/track/symbols';
import { textureOf, type ItemId } from '../src/items';
import type { Asset } from './catalog';

export type BossKind = RivalId | `${RivalId}.${string}`;
export type Foe = EnemySymbol | BossKind;
export const isBoss = (f: Foe | ''): f is BossKind => RIVAL_IDS.some(r => f === r || f.startsWith(`${r}.`));
export const rivalOf = (k: BossKind) => k.split('.')[0] as RivalId;
const BOSSES = Object.values(LEVELS).flatMap(l => l.bosses ?? []);
export const BOSS_THINGS: Record<RivalId, string[]> = {
  grey: ['fx.shockwave', 'fx.crater', 'fx.furrow', 'fx.plow'],
  teal: ['char.boss_teal_show', ...TEAL_PLUCKED.flatMap(n => [`char.boss_teal_plucked_${n}`, `char.boss_teal_show_plucked_${n}`]), 'item.feather'],
  lime: ['char.boss_lime_show', 'char.boss_lime_dazed', 'fx.lime_slash', 'fx.orb'],
};
const BOSS_MOVES: Record<RivalId, [string, string][]> = {
  grey: GREY_MOVES.map(m => [m, ({ pound: 'Pound', swoop: 'Swoop', double: 'DoubleSwoop', big: 'BigPound' } satisfies Record<GreyMove, string>)[m]]),
  teal: TEAL_MOVES.map(m => [m, ({ volley: 'Volley', rally: 'Rally', feint: 'Feint', finale: 'Finale', swoop: 'Swoop' } satisfies Record<TealMove, string>)[m]]),
  lime: LIME_MOVES.map(m => [m, ({ slash: 'Slash', charge: 'Charge', swoop: 'Swoop' } satisfies Record<LimeMove, string>)[m]]),
};

export function makeFoeBoss(scene: Phaser.Scene, k: BossKind, left: number): Boss<string> {
  const b = makeBoss(scene, left, BOSSES.find(s => s.rival === rivalOf(k))!);
  const move = k.split('.')[1];
  if (move) b.onlyMove = move;
  return b;
}

export interface Family { name: string; kinds: [Foe, string][] }
const foeName = (s: EnemySymbol) => ENEMY_SYMBOLS[s].name;
const SYMBOL_LIST = Object.keys(ENEMY_SYMBOLS) as EnemySymbol[];
const isBarrier = (s: EnemySymbol) => ENEMY_SYMBOLS[s].prototype instanceof Barrier;
export const CREATURES: Family[] = [
  { name: 'Rogue', kinds: [['r', 'Lunge'], ['R', 'Throw']] },
  { name: 'Kaktu', kinds: [['k', 'Sprint'], ['K', 'Shoot'], ['G', 'Big']] },
  { name: 'Archid', kinds: [['a', 'Drop'], ['A', 'Swing']] },
  { name: 'Fae', kinds: [['e', 'Float'], ['E', 'Throw']] },
];
for (const s of SYMBOL_LIST) {
  if (!isBarrier(s) && !CREATURES.some(f => f.kinds.some(([k]) => k === s))) CREATURES.push({ name: foeName(s), kinds: [[s, foeName(s)]] });
}
for (const { rival } of BOSSES) {
  CREATURES.push({
    name: EN[CHARACTERS[rival].name],
    kinds: [[rival, 'All'], ...BOSS_MOVES[rival].map(([m, name]) => [`${rival}.${m}`, name] as [Foe, string])],
  });
}
export const TARGETS: Family[] = [
  { name: 'None', kinds: [] },
  ...CREATURES,
  ...SYMBOL_LIST.filter(isBarrier).map(s => ({ name: foeName(s), kinds: [[s, foeName(s)]] as [Foe, string][] })),
];
export const kindsOf = (list: Family[]) => list.flatMap(f => f.kinds).map(([s]) => s);
export const familyOf = (list: Family[], s: Foe | '') => list.find(f => f.kinds.some(([k]) => k === s)) ?? list[0];
export const kindTitle = (list: Family[], s: Foe | '') => {
  const f = familyOf(list, s), kind = f.kinds.find(([k]) => k === s)?.[1];
  return f.kinds.length > 1 ? `${f.name} (${kind})` : f.name;
};
export const rowY = (s: EnemySymbol) => GROUND_Y - (SYMBOLS[s].rows?.[0] ?? 1) * TILE + TILE / 2;
export const ATTACKS: [Attack, string][] = [['peck', 'Peck'], ['cleave', 'Cleave'], ['dash', 'Dash'], ['rainbowCleave', 'RainbowCleave'], ['rainbowDash', 'RainbowDash']];

export const NO_PICKUPS: Arena['pickups'] = { look: (k: ItemId) => textureOf(k), drop: () => {} };

const enemyTex = new Map<EnemySymbol, string>();
export function learnTextures(scene: Phaser.Scene): void {
  for (const s of SYMBOL_LIST) {
    const e = new ENEMY_SYMBOLS[s](scene, -100, GROUND_Y, { pickups: NO_PICKUPS, loot: () => true });
    enemyTex.set(s, e.texture.key);
    e.destroy();
  }
}
export const symbolsOf = (a: Asset): EnemySymbol[] => {
  const key = a.key;
  if (!key?.startsWith('enemy.')) return [];
  const exact = [...enemyTex].filter(([, t]) => t === key).map(([s]) => s);
  if (exact.length) return exact;
  const owners = [...enemyTex].filter(([, t]) => key.startsWith(`${t}_`));
  const longest = Math.max(0, ...owners.map(([, t]) => t.length));
  return owners.filter(([, t]) => t.length === longest).map(([s]) => s);
};
