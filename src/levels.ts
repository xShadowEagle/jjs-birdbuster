import type { TextKey } from './texts/en';
import type { Block } from './track/symbols';
import { MEADOW, MEADOW_INTRO } from './track/meadow';
import { WOODS, WOODS_INTRO } from './track/woods';
import { SWAMP, SWAMP_INTRO } from './track/swamp';
import { JUNGLE, JUNGLE_INTRO } from './track/jungle';
import { TOWER, TOWER_INTRO } from './track/tower';
import { NEST } from './track/nest';
import type { BossSpec } from './entities/enemies/Boss';
import type { Verbs } from './controls';
import type { BiomeId } from './world/biomes';
import type { MusicKey } from './assets/manifest';
import type { ItemId } from './items';

export interface LevelDef {
  name: TextKey;
  biome: BiomeId;
  music: MusicKey;
  rainbowMusic?: MusicKey;
  goal?: { item: ItemId; count: number; oneIn?: number };
  /** none: can't be hurt */
  lives?: number;
  verbs: Verbs;
  teach?: keyof Verbs;
  intro?: Block;
  blocks: Block[];
  bosses?: BossSpec[];
}

const DEFS = {
  l1: { name: 'level.l1', biome: 'meadow', music: 'meadow', goal: { item: 'feather', count: 20 }, verbs: {}, intro: MEADOW_INTRO, blocks: MEADOW },
  l2: {
    name: 'level.l2', biome: 'woods', music: 'woods', goal: { item: 'berry', count: 10 }, lives: 3,
    verbs: { slide: true }, teach: 'slide', intro: WOODS_INTRO, blocks: WOODS,
  },
  l3: {
    name: 'level.l3', biome: 'swamp', music: 'swamp', goal: { item: 'firefly', count: 10, oneIn: 2 }, lives: 3,
    verbs: { slide: true, attack: true }, teach: 'attack', intro: SWAMP_INTRO, blocks: SWAMP,
  },
  l4: {
    name: 'level.l4', biome: 'jungle', music: 'jungle', goal: { item: 'coconut', count: 10, oneIn: 2 }, lives: 3,
    verbs: { slide: true, cleave: true }, teach: 'cleave', intro: JUNGLE_INTRO, blocks: JUNGLE,
  },
  l5: {
    name: 'level.l5', biome: 'tower', music: 'tower', goal: { item: 'key', count: 3, oneIn: 4 }, lives: 3,
    verbs: { slide: true, cleave: true, dash: true }, teach: 'dash', intro: TOWER_INTRO, blocks: TOWER,
  },
  boss: {
    name: 'level.boss', biome: 'nest', music: 'boss', rainbowMusic: 'rainbow', lives: 3,
    verbs: { slide: true, cleave: true, dash: true }, blocks: NEST,
    bosses: [
      { rival: 'grey', hp: 3, swoopSpeed: 240, hoverMs: 1600 },
      { rival: 'teal', hp: 4, swoopSpeed: 280, hoverMs: 1300 },
      { rival: 'lime', hp: 5, swoopSpeed: 320, hoverMs: 1000 },
    ],
  },
} satisfies Record<string, LevelDef>;

export type LevelId = keyof typeof DEFS;
export const LEVELS: Record<LevelId, LevelDef> = DEFS;
