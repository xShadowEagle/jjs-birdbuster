import type { ImageKey } from '../assets/manifest';

export interface ParallaxLayer {
  key: ImageKey;
  /** 0 = fixed to the screen, 1 = moves with the world */
  factor: number;
  drift?: number;
}

export interface Biome {
  sky: number;
  /** far to near */
  layers: ParallaxLayer[];
  ground: ImageKey;
  groundOverhang?: number;
  plank: ImageKey;
  /** 'f' in blocks picks from `small`, 'b' from `large` */
  decor: { small: ImageKey[]; large: ImageKey[] };
  /** '~' in blocks: `tile` repeated down from the top of the screen, `end` at the bottom */
  lowBranch?: { tile: ImageKey; end: ImageKey };
  dark?: { color: number; alpha: number };
  ceiling?: ImageKey;
}

const TOWER = {
  sky: 0x202020,
  layers: [
    { key: 'world.tower.back', factor: 0.05 },
    { key: 'world.tower.mountains', factor: 0.2 },
  ],
  ground: 'world.tower.ground',
  plank: 'world.tower.plank',
  decor: {
    small: ['world.tower.rubble'],
    large: ['world.tower.banner'],
  },
  lowBranch: { tile: 'world.tower.overhang', end: 'world.tower.overhang_end' },
} satisfies Biome;

const MEADOW_PROPS = {
  plank: 'world.meadow.plank',
  decor: {
    small: ['world.meadow.flower_pink', 'world.meadow.flower_blue', 'world.meadow.flower_white'],
    large: ['world.meadow.bush', 'world.meadow.bush_berries'],
  },
} satisfies Pick<Biome, 'plank' | 'decor'>;

const DEFS = {
  meadow: {
    sky: 0x0a89ff,
    layers: [
      { key: 'world.meadow.clouds', factor: 0.05, drift: 3 },
      { key: 'world.meadow.mountains', factor: 0.15 },
      { key: 'world.meadow.trees', factor: 0.35 },
    ],
    ground: 'world.meadow.ground',
    ...MEADOW_PROPS,
  },
  woods: {
    sky: 0xc3ab17,
    layers: [
      { key: 'world.woods.back', factor: 0.1 },
      { key: 'world.woods.mid', factor: 0.4 },
    ],
    ground: 'world.woods.ground',
    plank: 'world.woods.plank',
    decor: {
      small: ['world.woods.weeds', 'world.woods.mushroom', 'world.woods.sprout'],
      large: ['world.woods.rock', 'world.woods.toadstool'],
    },
    lowBranch: { tile: 'world.woods.branch', end: 'world.woods.branch_end' },
  },
  swamp: {
    sky: 0x224422,
    layers: [
      { key: 'world.swamp.back', factor: 0.1 },
      { key: 'world.swamp.mid', factor: 0.4 },
    ],
    ground: 'world.swamp.ground',
    groundOverhang: 4,
    dark: { color: 0x040a08, alpha: 0.45 },
    plank: 'world.swamp.plank',
    decor: {
      small: ['world.swamp.cattails', 'world.swamp.shrooms'],
      large: ['world.swamp.stump'],
    },
  },
  jungle: {
    sky: 0x96b624,
    layers: [
      { key: 'world.jungle.back', factor: 0.1 },
      { key: 'world.jungle.far', factor: 0.25 },
      { key: 'world.jungle.mid', factor: 0.45 },
    ],
    ground: 'world.jungle.ground',
    groundOverhang: 9,
    plank: 'world.jungle.plank',
    decor: {
      small: ['world.jungle.fern', 'world.jungle.flower'],
      large: ['world.jungle.leafbush'],
    },
  },
  tower: { ...TOWER, ceiling: 'world.tower.ceiling' },
  nest: {
    ...TOWER,
    layers: [
      { key: 'world.nest.sky', factor: 0 },
      { key: 'world.nest.back', factor: 0.05 },
      { key: 'world.nest.glow', factor: 0 },
      { key: 'world.nest.mountains', factor: 0.2 },
    ],
  },
  sunset: {
    sky: 0xffa080,
    layers: [
      { key: 'world.sunset.sky', factor: 0 },
      { key: 'world.sunset.mountains', factor: 0.15 },
      { key: 'world.sunset.trees', factor: 0.35 },
    ],
    ground: 'world.sunset.ground',
    ...MEADOW_PROPS,
  },
} satisfies Record<string, Biome>;

export type BiomeId = keyof typeof DEFS;
export const BIOMES: Record<BiomeId, Biome> = DEFS;
