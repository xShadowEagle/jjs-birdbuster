import { BIOMES, type BiomeId } from '../src/world/biomes';
import { GAME_W } from '../src/constants';
import type { Attack } from '../src/entities/enemies/Enemy';
import { ASSETS, animsOf, biomeOf, isWorldArt, type Asset, type Version } from './catalog';
import { ATTACKS, BOSS_THINGS, CREATURES, TARGETS, isBoss, kindsOf, rivalOf, symbolsOf, type Foe } from './foes';
import { SOUNDS } from './sounds';
import { EN, type TextKey } from '../src/texts/en';
import { LANGUAGES, type LanguageId } from '../src/language';
import { SPEAKERS } from '../tools/text-rules';

export const BIOME_IDS = Object.keys(BIOMES) as BiomeId[];
export const VIEW_IDS = ['scene', 'sheet', 'breaks', 'interface', 'enemies', 'attacks', 'sounds', 'texts'] as const;
export type View = (typeof VIEW_IDS)[number];

export const PRESS = ['Idle', 'Pressed', 'Cooling', 'Rainbow'] as const;
export const SHOWN = [['all', 'All'], ['todo', 'TODO'], ['problems', 'Problems']] as const;
export type Shown = (typeof SHOWN)[number][0];
type Press = (typeof PRESS)[number];
export const SWING_ICONS = ['Peck', 'Cleave'] as const;
export const POSES = ['Run', 'Slide'] as const;
type Pose = (typeof POSES)[number];

// the fields are the hash's parameters by name: renaming one breaks bookmarks
interface State {
  image: string; biome: BiomeId; anim: string; zoom: number; view: View; press: Press; swing: (typeof SWING_ICONS)[number]; pose: Pose;
  foe: Foe; attack: Attack; target: Foe | ''; boxes: boolean; sound: boolean; sfx: string; run: boolean; pick: number;
  text: TextKey; lang: LanguageId; only: Shown;
}

const fromHash = (): State => {
  const hash = new URLSearchParams(location.hash.slice(1));
  const image = ASSETS.find(a => a.file === hash.get('image'))?.file ?? ASSETS.find(a => a.key === 'char.bird')!.file;
  return {
    image,
    biome: BIOME_IDS.find(b => b === hash.get('biome')) ?? biomeOf(ASSETS.find(a => a.file === image)!) ?? 'meadow',
    anim: hash.get('anim') ?? '',
    zoom: Number(hash.get('zoom')) || 2,
    view: VIEW_IDS.find(v => v === hash.get('view')) ?? VIEW_IDS[0],
    press: PRESS.find(p => p === hash.get('press')) ?? PRESS[0],
    swing: SWING_ICONS.find(s => s === hash.get('swing')) ?? SWING_ICONS[0],
    pose: POSES.find(p => p === hash.get('pose')) ?? POSES[0],
    foe: kindsOf(CREATURES).find(s => s === hash.get('foe')) ?? CREATURES[0].kinds[0][0],
    attack: ATTACKS.find(([a]) => a === hash.get('attack'))?.[0] ?? ATTACKS[0][0],
    target: kindsOf(TARGETS).find(s => s === hash.get('target')) ?? '',
    boxes: hash.get('boxes') === '1',
    sound: hash.get('sound') === '1',
    sfx: SOUNDS.find(([name]) => name === hash.get('sfx'))?.[0] ?? SOUNDS[0][0],
    run: hash.get('run') === '1',
    pick: Number(hash.get('pick')) || 0,
    text: (hash.get('text') ?? '') in EN ? hash.get('text') as TextKey : [...SPEAKERS.keys()][0],
    lang: LANGUAGES.find(l => l.id === hash.get('lang'))?.id ?? 'de',
    only: SHOWN.find(([k]) => k === hash.get('only'))?.[0] ?? SHOWN[0][0],
  };
};
export const state = fromHash();
window.addEventListener('hashchange', () => { Object.assign(state, fromHash()); changed(); });

export const asset = () => ASSETS.find(a => a.file === state.image)!;
export const pickImage = (file: string) => {
  state.image = file;
  state.pick = 0;
  state.biome = biomeOf(asset()) ?? state.biome;
};

export const benchImages = (): Asset[] => {
  const foe = state.view === 'enemies' ? state.foe : state.view === 'attacks' ? state.target : '';
  const mine = (key: string) => state.view === 'attacks' && (key === 'char.bird' || key.startsWith('fx.'));
  const its = (a: Asset) => (isBoss(foe) ? a.key === `char.boss_${rivalOf(foe)}` || BOSS_THINGS[rivalOf(foe)].includes(a.key!) : !!foe && symbolsOf(a).includes(foe));
  return ASSETS.filter(a => a.key && (mine(a.key) || its(a)));
};
export const oneAtATime = (versions: Version[]): boolean => versions.some(v => (v.frame?.w ?? 0) * state.zoom > GAME_W / (versions.length + 1) + 8);
export const inPlace = () => state.view === 'scene' && isWorldArt(asset());

const listeners: (() => void)[] = [];
export const onChange = (fn: () => void) => { listeners.push(fn); };
// set by the panel: its view table imports this module, so it can't be imported here
let versionCount = () => 1;
export const countVersionsWith = (count: () => number) => { versionCount = count; };
export function changed(): void {
  const a = asset(), anims = animsOf(a);
  if (a.frame && !anims.includes(state.anim)) state.anim = anims[0];
  state.pick = Math.min(state.pick, versionCount() - 1);
  const h = new URLSearchParams(Object.entries(state).map(([k, v]) => [k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)]));
  history.replaceState(null, '', `#${h}`);
  for (const fn of listeners) fn();
}
