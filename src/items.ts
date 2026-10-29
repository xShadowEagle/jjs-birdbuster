import type { TextKey } from './texts/en';
import type { ImageKey } from './assets/manifest';
import { RIVAL_IDS } from './rivals';

interface Item {
  texture: ImageKey | readonly ImageKey[];
  one: TextKey;
  many: TextKey;
  carried?: boolean;
  plant?: ImageKey;
  /** the share of its plants that bear one, 0 to 1 (default 1) */
  bearing?: number;
}

const DEFS = {
  feather: { texture: 'item.feather', one: 'item.feather.one', many: 'item.feather.many' },
  berry: { texture: 'item.berry', one: 'item.berry.one', many: 'item.berry.many', plant: 'world.woods.berry_bush', bearing: 1 / 3 },
  firefly: { texture: 'item.firefly', one: 'item.firefly.one', many: 'item.firefly.many', carried: true },
  coconut: { texture: 'item.coconut', one: 'item.coconut.one', many: 'item.coconut.many', carried: true },
  key: { texture: RIVAL_IDS.map(r => `item.key.${r}` as const), one: 'item.key.one', many: 'item.key.many', carried: true },
} satisfies Record<string, Item>;

export type ItemId = keyof typeof DEFS;
export const ITEMS: Record<ItemId, Item> = DEFS;

export function textureOf(kind: ItemId, collected = 0): ImageKey {
  const t = ITEMS[kind].texture;
  return typeof t === 'string' ? t : t[Math.min(collected, t.length - 1)];
}

