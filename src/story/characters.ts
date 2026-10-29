import type { ImageKey } from '../assets/manifest';
import type { TextKey } from '../texts/en';
import { RIVALS, RIVAL_IDS, type RivalId } from '../rivals';

// `voice`: the base pitch (Hz) of the typewriter blips.
export interface Character { name: TextKey; portrait: ImageKey; color: number; voice: number }

export const CHARACTERS = {
  jj: { name: 'name.jj', portrait: 'portrait.jj', color: 0xe41770, voice: 520 },
  bird: { name: 'name.bird', portrait: 'portrait.bird', color: 0xf0a93a, voice: 820 },
  flo: { name: 'name.flo', portrait: 'portrait.flo', color: 0x4f8fd8, voice: 330 },
  cat: { name: 'name.cat', portrait: 'portrait.cat', color: 0xf0507e, voice: 760 },
  ...(Object.fromEntries(RIVAL_IDS.map(r => [r, { ...RIVALS[r], portrait: `portrait.${r}` }])) as Record<RivalId, Character>),
} satisfies Record<string, Character>;

export type CharacterId = keyof typeof CHARACTERS;

export const RUN_LINES = {
  'boss.huh': 'jj', 'boss.notWorking': 'jj', 'boss.catsFly': 'jj', 'boss.orb.smell': 'jj',
  'boss.cat.quip': 'cat', 'boss.cat.take': 'cat', 'boss.lime.giveBack': 'lime', 'boss.lime.myEgg': 'lime',
} satisfies Partial<Record<TextKey, CharacterId>>;

export type RunLine = keyof typeof RUN_LINES;
