import type { TextKey } from './texts/en';
import type { AnimKey, TextureKey } from './assets/manifest';

interface CastMember { name: TextKey; role: TextKey; sprites: { texture: TextureKey; anim?: AnimKey }[] }

export const CAST: CastMember[] = [
  { name: 'name.jj', role: 'credits.cast.jj', sprites: [{ texture: 'char.jj', anim: 'jj_idle' }] },
  { name: 'name.bird', role: 'credits.cast.bird', sprites: [{ texture: 'char.bird_solo', anim: 'solo_idle' }] },
  { name: 'name.flo', role: 'credits.cast.flo', sprites: [{ texture: 'char.flo', anim: 'flo_idle' }] },
  { name: 'name.cat', role: 'credits.cast.cat', sprites: [{ texture: 'char.cat', anim: 'cat_sit' }] },
  { name: 'name.grey', role: 'credits.cast.grey', sprites: [{ texture: 'char.rival_grey', anim: 'grey_idle' }] },
  { name: 'name.teal', role: 'credits.cast.teal', sprites: [{ texture: 'char.rival_teal', anim: 'teal_idle' }] },
  { name: 'name.lime', role: 'credits.cast.lime', sprites: [{ texture: 'char.rival_lime_brood', anim: 'lime_brood' }] },
  {
    name: 'credits.cast.extras', role: 'credits.cast.extrasRole',
    sprites: [{ texture: 'enemy.rogue', anim: 'rogue_creep' }, { texture: 'enemy.kaktu', anim: 'kaktu_run' }, { texture: 'enemy.archid', anim: 'archid_hang' }, { texture: 'enemy.fae', anim: 'fae_float' }],
  },
];

interface CreditSection { heading: TextKey; lines: TextKey[] }

export const CREDITS: CreditSection[] = [
  { heading: 'credits.backdrops', lines: ['credits.backdrops.1', 'credits.backdrops.2', 'credits.backdrops.3', 'credits.backdrops.4'] },
  { heading: 'credits.music', lines: ['credits.music.1', 'credits.music.2'] },
  { heading: 'credits.ours', lines: ['credits.ours.1'] },
  { heading: 'credits.builtWith', lines: ['credits.builtWith.1', 'credits.builtWith.2', 'credits.builtWith.3', 'credits.builtWith.4', 'credits.builtWith.5'] },
];
