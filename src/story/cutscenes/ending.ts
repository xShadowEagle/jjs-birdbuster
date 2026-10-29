import { GROUND_Y } from '../../constants';
import type { AnimKey } from '../../assets/manifest';
import type { ActorSpec, Beat, CutsceneDef } from '../cutscene';
import { FLO_IN_NEST, RIDER, riderIn } from './beats';

const RIDER_X = 84;
const COCONUT_SIZE = 13, ROW_RISE = 10;
const GREY_X = 134, TEAL_X = 180, LIME_X = 225;
const GREY_DAZED_X = 158, TEAL_DAZED_X = 204;
const EGGS: { x: number; y: number }[] = [
  ...[-0.5, 0.5].map(i => ({ x: GREY_X + i * COCONUT_SIZE, y: GROUND_Y })),
  ...[-0.5, 0.5].map(i => ({ x: TEAL_X + i * COCONUT_SIZE, y: GROUND_Y })),
  ...[-1, 0, 1].map(i => ({ x: LIME_X + i * COCONUT_SIZE, y: GROUND_Y })),
  ...[-0.5, 0.5].map(i => ({ x: LIME_X + i * COCONUT_SIZE, y: GROUND_Y - ROW_RISE })),
  { x: LIME_X, y: GROUND_Y - 2 * ROW_RISE },
];
const ORDER = [6, 5, 4, 8, 7, 9, 3, 2, 1, 0];
const FROM_X = -12, SPEED = 220, GAP_MS = 180;
const PAIR_SIT = GROUND_Y - COCONUT_SIZE + 6, PILE_SIT = GROUND_Y - 2 * ROW_RISE - COCONUT_SIZE + 6;

const roll = (i: number): Beat[] => {
  const { x, y } = EGGS[i], d = x - FROM_X;
  return [
    { show: `egg${i}` },
    { move: `egg${i}`, x, y, angle: (d / (Math.PI * COCONUT_SIZE)) * 360, ms: Math.round((d / SPEED) * 1000), ease: 'Quad.out', async: true },
    { wait: GAP_MS },
  ];
};
const hop = (id: string, from: number, x: number, y: number, glide: AnimKey, brood: AnimKey): Beat[] => [
  { move: id, x: (from + x) / 2, y: y - 16, ms: 220, ease: 'Quad.out', anim: glide },
  { move: id, x, y, ms: 220, ease: 'Quad.in', then: brood },
  { sound: 'land' },
];

const actors: ActorSpec[] = [
  ...FLO_IN_NEST,
  ...EGGS.map((_, i): ActorSpec => ({ id: `egg${i}`, texture: 'enemy.archid_coconut', x: FROM_X, hidden: true, depth: 5, rolls: true })),
  { id: 'grey', texture: 'char.rival_grey', anim: 'grey_hurt', x: GREY_DAZED_X, flip: true, depth: 6 },
  { id: 'teal', texture: 'char.rival_teal_plucked', anim: 'teal_plucked_hurt', x: TEAL_DAZED_X, flip: true, depth: 6 },
  { id: 'lime', texture: 'char.rival_lime', anim: 'lime_hurt', x: 356, flip: true, depth: 6 },
  { id: 'feather', texture: 'prop.cat_feather', x: 124, y: -2, depth: 7 },
  RIDER,
];

export const ending: CutsceneDef = {
  stage: 'nest',
  music: 'ending',
  actors,
  beats: [
    riderIn(RIDER_X, 1300),
    { wait: 300 },
    { say: 'jj', text: 'ending.deal', at: 'rider' },
    ...ORDER.flatMap(roll),
    { wait: 900 },
    { play: 'lime', anim: 'lime_idle' },
    { emote: 'lime', icon: 'exclaim' },
    { wait: 150 },
    { play: 'teal', anim: 'teal_plucked_idle' },
    { emote: 'teal', icon: 'exclaim' },
    { play: 'grey', anim: 'grey_idle' },
    { emote: 'grey', icon: 'exclaim' },
    { wait: 500 },
    { say: 'lime', text: 'ending.eggs' },
    { move: 'lime', x: 300, y: GROUND_Y - 64, ms: 380, ease: 'Quad.out', anim: 'lime_glide' },
    { move: 'lime', x: LIME_X, y: PILE_SIT, ms: 420, ease: 'Quad.in', then: 'lime_brood' },
    { sound: 'land' },
    { emote: 'lime', icon: 'heart' },
    { wait: 500 },
    { say: 'grey', text: 'intro.eggIsEgg' },
    ...hop('grey', GREY_DAZED_X, GREY_X, PAIR_SIT, 'grey_glide', 'grey_brood'),
    { say: 'teal', text: 'ending.look' },
    ...hop('teal', TEAL_DAZED_X, TEAL_X, PAIR_SIT, 'teal_plucked_glide', 'teal_plucked_brood'),
    { wait: 400 },
    { say: 'flo', text: 'ending.legs' },
    { move: 'flo', x: 190, y: GROUND_Y - 78, ms: 480, ease: 'Quad.out', anim: 'flo_help' },
    { move: 'flo', x: RIDER_X - 14, y: GROUND_Y - 24, ms: 420, ease: 'Quad.in' },
    { hide: 'flo' },
    { play: 'rider', anim: 'pair_groan' },
    { sound: 'land' },
    { shake: 150 },
    { say: 'bird', text: 'ending.groan', at: 'rider' },
    { play: 'rider', anim: 'pair_idle' },
    { wait: 400 },
    { say: 'jj', text: 'ending.cat', at: 'rider' },
    { say: 'flo', text: 'ending.whatCat', at: 'rider' },
    { move: 'feather', x: 112, y: 70, angle: -25, ms: 1100, ease: 'Sine.inOut' },
    { move: 'feather', x: 128, y: 130, angle: 25, ms: 1100, ease: 'Sine.inOut' },
    { move: 'feather', x: 116, y: GROUND_Y, angle: -60, ms: 1000, ease: 'Sine.inOut' },
    { wait: 500 },
    { emote: 'rider', icon: 'heart' },
    { say: 'jj', text: 'ending.home', at: 'rider' },
    { move: 'rider', x: 470, ms: 1700, anim: 'pair_run', ease: 'Quad.in' },
  ],
};
