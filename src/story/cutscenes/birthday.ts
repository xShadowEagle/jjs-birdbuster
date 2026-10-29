import { GROUND_Y } from '../../constants';
import type { CutsceneDef } from '../cutscene';
import { PICNIC } from './beats';

const BIRD_X = 104, JJ_X = 150, FLO_X = 238;
const CAT_X = 212, CAKE_X = 186;
const JJ_HANDS = { x: JJ_X + 8, y: GROUND_Y - 12 };

export const birthday: CutsceneDef = {
  stage: 'sunset',
  music: 'birthday',
  actors: [
    PICNIC,
    { id: 'cake', texture: 'prop.cake', anim: 'cake_flicker', x: CAKE_X, y: GROUND_Y - 2 },
    { id: 'bird', texture: 'char.bird_solo', anim: 'solo_idle', x: BIRD_X, hidden: true },
    { id: 'jj', texture: 'char.jj', anim: 'jj_idle', x: BIRD_X - 2, y: GROUND_Y - 14, hidden: true, depth: 1 },
    { id: 'flo', texture: 'char.flo', anim: 'flo_idle', x: BIRD_X - 14, y: GROUND_Y - 14, hidden: true },
    { id: 'rider', texture: 'char.bird_pair', anim: 'pair_run', x: -30 },
    { id: 'cat', texture: 'char.cat', anim: 'cat_fly', x: 440, y: 40, flip: true, depth: 3 },
    { id: 'card', texture: 'prop.note', x: 428, y: 36, depth: 4 },
  ],
  beats: [
    { move: 'rider', x: BIRD_X, ms: 1800, anim: 'pair_run', then: 'pair_idle', ease: 'Quad.out' },
    { wait: 500 },
    { hide: 'rider' },
    { show: 'bird' },
    { show: 'jj' },
    { show: 'flo' },
    { move: 'jj', x: (BIRD_X + JJ_X) / 2, y: GROUND_Y - 30, ms: 220, ease: 'Quad.out', async: true },
    { move: 'flo', x: 165, y: GROUND_Y - 48, ms: 380, ease: 'Quad.out', async: true },
    { wait: 220 },
    { move: 'jj', x: JJ_X, y: GROUND_Y, ms: 220, ease: 'Quad.in' },
    { sound: 'land' },
    { move: 'flo', x: FLO_X, y: GROUND_Y, ms: 380, ease: 'Quad.in' },
    { sound: 'land' },
    { face: 'flo', left: true },
    { wait: 500 },
    { say: 'flo', text: 'birthday.wait' },
    { emote: 'jj', icon: 'question' },
    { wait: 400 },
    { sound: 'whoosh' },
    { move: 'cat', x: JJ_HANDS.x + 22, y: GROUND_Y - 44, ms: 1100, ease: 'Sine.inOut', async: true },
    { move: 'card', x: JJ_HANDS.x + 10, y: GROUND_Y - 48, ms: 1100, ease: 'Sine.inOut' },
    { move: 'card', x: JJ_HANDS.x, y: JJ_HANDS.y, angle: 10, ms: 360, ease: 'Quad.in', async: true },
    { face: 'cat', left: false },
    { move: 'cat', x: CAT_X, y: GROUND_Y - 2, ms: 600, ease: 'Sine.inOut', then: 'cat_sit' },
    { face: 'cat', left: true },
    { emote: 'jj', icon: 'exclaim' },
    { say: 'cat', text: 'birthday.delivery' },
    { sound: 'clear' },
    { confetti: 8000 },
    { play: 'flo', anim: 'flo_help' },
    { caption: 'birthday.happy', sub: 'birthday.dear', ms: 2400 },
    { emote: 'jj', icon: 'heart' },
    { say: 'bird', text: 'birthday.kweh' },
    { play: 'flo', anim: 'flo_idle' },
    {
      card: {
        title: 'birthday.card.title',
        lines: [
          'birthday.card.1',
          'birthday.card.2',
        ],
        from: 'birthday.card.from',
      },
    },
    { wait: 600 },
    { move: 'cat', x: CAKE_X + 23, ms: 300, ease: 'Sine.inOut' },
    { sound: 'peck' },
    { play: 'cake', anim: 'cake_bitten' },
    { wait: 250 },
    { sound: 'peck' },
    { emote: 'cat', icon: 'heart' },
    { say: 'flo', text: 'birthday.cake' },
    { wait: 600 },
  ],
};
