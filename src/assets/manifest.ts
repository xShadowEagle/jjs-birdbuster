// Paths are relative to public/assets/.

import { RIVAL_IDS } from '../rivals';

export const TEAL_PLUCKED = [1, 2, 3] as const;
export type TealPlucked = (typeof TEAL_PLUCKED)[number];

const keyed = <T, K extends string, V>(list: readonly T[], entry: (x: T, i: number) => readonly [K, V]): Record<K, V> =>
  Object.fromEntries(list.map(entry)) as Record<K, V>;

export const IMAGES = {
  'item.feather': 'items/feather.png',
  'item.berry': 'items/berry.png',
  'item.firefly': 'items/firefly.png',
  'item.coconut': 'items/coconut.png',
  ...keyed(RIVAL_IDS, r => [`item.key.${r}`, `items/key_${r}.png`]),

  'enemy.rogue_knife': 'enemies/rogue_knife.png',
  'enemy.kaktu_needle': 'enemies/kaktu_needle.png',
  'enemy.archid_coconut': 'enemies/archid_coconut.png',
  'enemy.fae_spark': 'enemies/fae_spark.png',

  'prop.note': 'props/note.png',
  'prop.picnic': 'props/picnic.png',
  'prop.nest': 'props/nest.png',
  'prop.cat_feather': 'props/cat_feather.png',
  ...keyed(RIVAL_IDS, r => [`prop.lock.${r}`, `props/lock_${r}.png`]),

  'portrait.jj': 'portraits/jj.png',
  'portrait.bird': 'portraits/bird.png',
  'portrait.flo': 'portraits/flo.png',
  'portrait.cat': 'portraits/cat.png',
  ...keyed(RIVAL_IDS, r => [`portrait.${r}`, `portraits/rival_${r}.png`]),

  'emote.exclaim': 'emotes/exclaim.png',
  'emote.question': 'emotes/question.png',
  'emote.heart': 'emotes/heart.png',
  'emote.dots': 'emotes/dots.png',
  'emote.anger': 'emotes/anger.png',

  'ui.pause': 'ui/pause.png',
  'ui.sound': 'ui/sound.png',
  'ui.mute': 'ui/mute.png',
  'ui.heart': 'ui/heart.png',
  'ui.heart_empty': 'ui/heart_empty.png',
  'ui.icon_jump': 'ui/icon_jump.png',
  'ui.icon_slide': 'ui/icon_slide.png',
  'ui.icon_attack': 'ui/icon_attack.png',
  'ui.icon_cleave': 'ui/icon_cleave.png',
  'ui.icon_dash': 'ui/icon_dash.png',
  'ui.icon_cleave_rainbow': 'ui/icon_cleave_rainbow.png',
  'ui.icon_dash_rainbow': 'ui/icon_dash_rainbow.png',

  'fx.spark': 'fx/spark.png',
  'fx.puff': 'fx/puff.png',
  'fx.slash': 'fx/slash.png',
  'fx.glow': 'fx/glow.png',
  /** white: tinted in code */
  'fx.star': 'fx/star.png',
  'fx.crater': 'fx/crater.png',
  'fx.furrow': 'fx/furrow.png',
  'fx.plow': 'fx/plow.png',

  'world.meadow.clouds': 'world/meadow/clouds.png',
  'world.meadow.mountains': 'world/meadow/mountains.png',
  'world.meadow.trees': 'world/meadow/trees.png',
  'world.meadow.ground': 'world/meadow/ground.png',
  'world.meadow.plank': 'world/meadow/plank.png',
  'world.meadow.flower_pink': 'world/meadow/flower_pink.png',
  'world.meadow.flower_blue': 'world/meadow/flower_blue.png',
  'world.meadow.flower_white': 'world/meadow/flower_white.png',
  'world.meadow.bush': 'world/meadow/bush.png',
  'world.meadow.bush_berries': 'world/meadow/bush_berries.png',

  'world.woods.back': 'world/woods/back.png',
  'world.woods.mid': 'world/woods/mid.png',
  'world.woods.ground': 'world/woods/ground.png',
  'world.woods.plank': 'world/woods/plank.png',
  'world.woods.weeds': 'world/woods/weeds.png',
  'world.woods.sprout': 'world/woods/sprout.png',
  'world.woods.mushroom': 'world/woods/mushroom.png',
  'world.woods.toadstool': 'world/woods/toadstool.png',
  'world.woods.rock': 'world/woods/rock.png',
  'world.woods.branch': 'world/woods/branch.png',
  'world.woods.branch_end': 'world/woods/branch_end.png',
  'world.tower.ceiling': 'world/tower/ceiling.png',
  'world.tower.overhang': 'world/tower/overhang.png',
  'world.tower.overhang_end': 'world/tower/overhang_end.png',
  'world.woods.berry_bush': 'world/woods/berry_bush.png',

  'world.swamp.back': 'world/swamp/back.png',
  'world.swamp.mid': 'world/swamp/mid.png',
  'world.swamp.ground': 'world/swamp/ground.png',
  'world.swamp.plank': 'world/swamp/plank.png',
  'world.swamp.cattails': 'world/swamp/cattails.png',
  'world.swamp.shrooms': 'world/swamp/shrooms.png',
  'world.swamp.stump': 'world/swamp/stump.png',

  'world.jungle.back': 'world/jungle/back.png',
  'world.jungle.far': 'world/jungle/far.png',
  'world.jungle.mid': 'world/jungle/mid.png',
  'world.jungle.ground': 'world/jungle/ground.png',
  'world.jungle.plank': 'world/jungle/plank.png',
  'world.jungle.fern': 'world/jungle/fern.png',
  'world.jungle.flower': 'world/jungle/flower.png',
  'world.jungle.leafbush': 'world/jungle/leafbush.png',
  'world.jungle.web': 'world/jungle/web.png',

  'world.tower.back': 'world/tower/back.png',
  'world.tower.mountains': 'world/tower/mountains.png',
  'world.tower.ground': 'world/tower/ground.png',
  'world.tower.plank': 'world/tower/plank.png',
  'world.tower.rubble': 'world/tower/rubble.png',
  'world.tower.banner': 'world/tower/banner.png',
  'world.tower.wall': 'world/tower/wall.png',
  'world.tower.gate': 'world/tower/gate.png',
  'world.tower.doorway': 'world/tower/doorway.png',

  'world.nest.sky': 'world/nest/sky.png',
  'world.nest.back': 'world/nest/back.png',
  'world.nest.mountains': 'world/nest/mountains.png',
  'world.nest.glow': 'world/nest/glow.png',

  'world.sunset.sky': 'world/sunset/sky.png',
  'world.sunset.mountains': 'world/sunset/mountains.png',
  'world.sunset.trees': 'world/sunset/trees.png',
  'world.sunset.ground': 'world/sunset/ground.png',
} as const;

export const PAGE_IMAGES = {
  'ui.phone': 'ui/phone.png',
  'page.icon': 'page/icon.png',
  'page.touch_icon': 'page/touch_icon.png',
  'page.preview': 'page/preview.png',
  'page.banner': 'page/banner.png',
  'page.loading': 'page/loading.png',
  'page.asleep': 'page/asleep.png',
  'page.asleep_words': 'page/asleep_words.png',
} as const;

export const BIRD_FRAMES = {
  idle: [0, 1], run: [2, 7], jump: [8, 9], glide: [10, 11], slide: [12, 13], hurt: [14, 14], peck: [15, 16], cleave: [17, 19], dash: [20, 21],
} as const;
type BirdPose = keyof typeof BIRD_FRAMES;
export const PAIR_FRAMES = { idle: [0, 1], run: [2, 7], groan: [8, 9] } as const;
type Sheet = { file: string; w: number; h: number };
const BIRD_SIZE = { w: 40, h: 40 };
const BOSS_SIZE = { w: BIRD_SIZE.w * 2, h: BIRD_SIZE.h * 2 };

export const SHEETS = {
  'char.bird': { file: 'characters/bird.png', ...BIRD_SIZE },
  'char.bird_solo': { file: 'characters/bird_solo.png', ...BIRD_SIZE },
  'char.bird_pair': { file: 'characters/bird_pair.png', w: 48, h: BIRD_SIZE.h },
  ...keyed(RIVAL_IDS, r => [`char.rival_${r}`, { file: `characters/rival_${r}.png`, ...BIRD_SIZE }]),
  ...keyed(RIVAL_IDS, r => [`char.rival_${r}_brood`, { file: `characters/rival_${r}_brood.png`, ...BIRD_SIZE }]),
  ...keyed(RIVAL_IDS, r => [`char.boss_${r}`, { file: `characters/boss_${r}.png`, ...BOSS_SIZE }]),
  'char.boss_teal_show': { file: 'characters/boss_teal_show.png', ...BOSS_SIZE },
  'char.boss_lime_show': { file: 'characters/boss_lime_show.png', ...BOSS_SIZE },
  'char.boss_lime_dazed': { file: 'characters/boss_lime_dazed.png', ...BOSS_SIZE },
  ...keyed(TEAL_PLUCKED.flatMap(n => [['', n], ['show_', n]] as const), ([show, n]) =>
    [`char.boss_teal_${show}plucked_${n}`, { file: `characters/boss_teal_${show}plucked_${n}.png`, ...BOSS_SIZE }]),
  'char.rival_teal_plucked': { file: 'characters/rival_teal_plucked.png', ...BIRD_SIZE },
  'char.rival_teal_plucked_brood': { file: 'characters/rival_teal_plucked_brood.png', ...BIRD_SIZE },
  'char.jj': { file: 'characters/jj.png', w: 22, h: 34 },
  'char.flo': { file: 'characters/flo.png', w: 20, h: 32 },
  'char.cat': { file: 'characters/cat.png', w: 24, h: 20 },
  'enemy.rogue': { file: 'enemies/rogue.png', w: 24, h: 22 },
  'enemy.kaktu': { file: 'enemies/kaktu.png', w: 24, h: 28 },
  'enemy.kaktu_big': { file: 'enemies/kaktu_big.png', w: 32, h: 39 },
  'enemy.archid': { file: 'enemies/archid.png', w: 26, h: 22 },
  'enemy.fae': { file: 'enemies/fae.png', w: 26, h: 35 },
  'fx.peck': { file: 'fx/peck.png', w: 11, h: 11 },
  'ui.rainbow_ring': { file: 'ui/rainbow_ring.png', w: 48, h: 48 },
  'fx.dash': { file: 'fx/dash.png', w: 40, h: 48 },
  'fx.orb': { file: 'fx/orb.png', w: 12, h: 12 },
  'fx.lime_slash': { file: 'fx/lime_slash.png', w: 19, h: 22 },
  'fx.rainbow_cone': { file: 'fx/rainbow_cone.png', w: 40, h: 48 },
  'fx.rainbow_blast': { file: 'fx/rainbow_blast.png', w: 64, h: 64 },
  'fx.rainbow_beam': { file: 'fx/rainbow_beam.png', w: 36, h: 42 },
  'fx.shockwave': { file: 'fx/shockwave.png', w: 24, h: 16 },
  'prop.cake': { file: 'props/cake.png', w: 26, h: 24 },
} as const satisfies Record<string, Sheet>;

type Frames = { sheet: SheetKey; frames: readonly number[]; fps: number; loop?: boolean };
const f = (sheet: SheetKey, from: number, to: number, fps: number, loop = true): Frames =>
  ({ sheet, frames: Array.from({ length: to - from + 1 }, (_, i) => from + i), fps, loop });

const BIRD_FPS: Record<BirdPose, [fps: number, loop: boolean]> = {
  idle: [3, true], run: [14, true], jump: [6, true], glide: [8, true], slide: [8, true],
  hurt: [1, false], peck: [20, false], cleave: [18, false], dash: [12, true],
};
const pose = (sheet: SheetKey, p: BirdPose): Frames => f(sheet, BIRD_FRAMES[p][0], BIRD_FRAMES[p][1], ...BIRD_FPS[p]);

export const ANIMS = {
  ...keyed(Object.keys(BIRD_FRAMES) as BirdPose[], p => [p, pose('char.bird', p)]),
  solo_idle: pose('char.bird_solo', 'idle'),
  pair_idle: f('char.bird_pair', PAIR_FRAMES.idle[0], PAIR_FRAMES.idle[1], BIRD_FPS.idle[0]),
  pair_run: f('char.bird_pair', PAIR_FRAMES.run[0], PAIR_FRAMES.run[1], BIRD_FPS.run[0]),
  pair_groan: f('char.bird_pair', PAIR_FRAMES.groan[0], PAIR_FRAMES.groan[1], 10),
  ...keyed(RIVAL_IDS.flatMap(r => (['glide', 'dash', 'run', 'idle', 'hurt'] as const).map(p => [r, p] as const)), ([r, p]) => [`${r}_${p}`, pose(`char.rival_${r}`, p)]),
  ...keyed(RIVAL_IDS, r => [`${r}_brood`, f(`char.rival_${r}_brood`, 0, 1, 2)]),
  ...keyed(['glide', 'idle', 'hurt'] as const, p => [`teal_plucked_${p}`, pose('char.rival_teal_plucked', p)]),
  teal_plucked_brood: f('char.rival_teal_plucked_brood', 0, 1, 2),
  ...keyed(RIVAL_IDS.flatMap(r => (['glide', 'dash', 'run'] as const).map(p => [r, p] as const)), ([r, p]) => [`boss_${r}_${p}`, pose(`char.boss_${r}`, p)]),
  // only the workbench plays these three: the game holds their frames itself
  boss_teal_throw: f('char.boss_teal_show', 0, 2, 5),
  boss_teal_flourish: f('char.boss_teal_show', 3, 4, 3),
  boss_lime_slash: f('char.boss_lime_show', 0, 2, 3),
  boss_lime_dazed: f('char.boss_lime_dazed', 0, 3, 12),
  lime_slash: f('fx.lime_slash', 0, 1, 10),
  orb_spin: f('fx.orb', 0, 3, 8),
  ...keyed(TEAL_PLUCKED.flatMap(n => (['glide', 'dash', 'run'] as const).map(p => [n, p] as const)), ([n, p]) => [`boss_teal_plucked_${n}_${p}`, pose(`char.boss_teal_plucked_${n}`, p)]),
  jj_idle: f('char.jj', 0, 1, 2),
  jj_walk: f('char.jj', 2, 5, 10),
  flo_idle: f('char.flo', 0, 1, 2),
  flo_help: { sheet: 'char.flo', frames: [2, 0], fps: 4, loop: true },
  cat_sit: f('char.cat', 0, 0, 1),
  cat_sleep: f('char.cat', 1, 1, 1),
  cat_fly: f('char.cat', 2, 3, 6),
  cake_flicker: f('prop.cake', 0, 1, 5),
  cake_bitten: f('prop.cake', 2, 3, 5),
  peck_pop: f('fx.peck', 0, 2, 25, false),
  shockwave_roll: f('fx.shockwave', 0, 3, 12),
  rogue_creep: f('enemy.rogue', 0, 1, 4),
  kaktu_run: f('enemy.kaktu', 0, 3, 10),
  kaktu_run_lit: f('enemy.kaktu', 5, 8, 10),
  kaktu_puff_lit: f('enemy.kaktu', 9, 9, 1),
  kaktu_big_run: f('enemy.kaktu_big', 0, 3, 8),
  kaktu_big_run_lit: f('enemy.kaktu_big', 4, 7, 8),
  archid_hang: f('enemy.archid', 0, 1, 3),
  fae_float: f('enemy.fae', 0, 1, 3),
  ...keyed(RIVAL_IDS, (r, i) => [`fae_hold_${r}`, f('enemy.fae', 2 + i * 2, 3 + i * 2, 3)]),
} satisfies Record<string, Frames>;

export const MUSIC = {
  title: 'exploration',
  cutscene: 'summer-nights',
  meadow: 'world-wanderer',
  woods: 'hurry-up-and-run',
  swamp: 'going-up',
  jungle: 'chibi-robot-b',
  tower: 'dark-happy-world',
  nest: 'up-and-right',
  boss: 'megabot',
  rainbow: 'maniac',
  ending: 'happywalking',
  birthday: 'hurt-and-heart',
} as const;

export type MusicKey = keyof typeof MUSIC;
export type MusicTrack = (typeof MUSIC)[MusicKey];
export const musicUrls = (track: MusicTrack) => [`assets/music/${track}.ogg`, `assets/music/${track}.mp3`];

export type ImageKey = keyof typeof IMAGES;
export type SheetKey = keyof typeof SHEETS;
export type TextureKey = ImageKey | SheetKey;
export type AnimKey = keyof typeof ANIMS;
