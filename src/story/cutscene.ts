import type { TextKey } from '../texts/en';
import type { TextVars } from '../language';
import type { CharacterId } from './characters';
import type { AnimKey, ImageKey, MusicKey, TextureKey } from '../assets/manifest';
import type { sfx } from '../audio/sfx';
import type { BiomeId } from '../world/biomes';
import { RIVAL_IDS } from '../rivals';

// Positions are in screen px; an actor's (x, y) is its feet, y by default the ground line.

export type Emote = ImageKey extends infer K ? (K extends `emote.${infer E}` ? E : never) : never;
type Sound = { [K in keyof typeof sfx]: (typeof sfx)[K] extends () => void ? K : never }[keyof typeof sfx];

const BIRD_HEAD = { x: 8, top: 37 }, BROOD_HEAD = { x: 6, top: 25 };

/** Heads that aren't at their sprite's top centre: from the actor's feet, facing right, on the idle frame. */
export const HEADS: Partial<Record<TextureKey, Partial<Record<CharacterId, { x: number; top: number }>>>> = {
  'char.bird': { jj: { x: -5, top: 38 }, bird: BIRD_HEAD },
  'char.bird_solo': { bird: BIRD_HEAD },
  'char.bird_pair': { jj: { x: -4, top: 38 }, bird: BIRD_HEAD, flo: { x: -15, top: 37 } },
  'char.rival_teal_plucked': { teal: BIRD_HEAD },
  'char.rival_teal_plucked_brood': { teal: BROOD_HEAD },
  'char.cat': { cat: { x: 4, top: 19 } },
  ...Object.fromEntries(RIVAL_IDS.map(r => [`char.rival_${r}`, { [r]: BIRD_HEAD }])),
  ...Object.fromEntries(RIVAL_IDS.map(r => [`char.rival_${r}_brood`, { [r]: BROOD_HEAD }])),
};

export interface ActorSpec {
  id: string;
  texture: TextureKey;
  anim?: AnimKey;
  x: number;
  y?: number;
  flip?: boolean;
  hidden?: boolean;
  depth?: number;
  scale?: number;
  thread?: boolean;
  tint?: number;
  /** turns about its centre; (x, y) still its feet */
  rolls?: boolean;
}

export type Beat =
  | { say: CharacterId; text: TextKey; at?: string }
  /** `angle`: degrees */
  | { move: string; x?: number; y?: number; angle?: number; ms: number; ease?: string; anim?: AnimKey; then?: AnimKey; async?: boolean }
  /** `who`: whose head, on a sheet with several (default: the first in HEADS) */
  | { emote: string; icon: Emote; who?: CharacterId }
  | { wait: number }
  | { play: string; anim: AnimKey }
  | { show: string }
  | { hide: string }
  | { face: string; left: boolean }
  | { shake: number }
  | { sound: Sound }
  | { caption: TextKey; sub?: TextKey; vars?: TextVars; ms?: number }
  | { confetti: number }
  | { card: { title: TextKey; lines: TextKey[]; from?: TextKey } };

export interface CutsceneDef {
  stage: BiomeId;
  music?: MusicKey;
  actors: ActorSpec[];
  beats: Beat[];
}
