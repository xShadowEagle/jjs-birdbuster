import { GROUND_Y } from '../../constants';
import type { CutsceneDef } from '../cutscene';
import { FLO_IN_NEST, FLO_Y, NEST_X, RIDER, riderIn } from './beats';
import { LEVELS } from '../../levels';

const GREY_X = NEST_X - 74, COCONUT_X = GREY_X - 16, STOMP_X = 172;
const LIME_Y = FLO_Y - 27, LIME_X = NEST_X - 4;

export const nestBoss: CutsceneDef = {
  stage: 'nest',
  music: 'nest',
  actors: [
    ...FLO_IN_NEST,
    { id: 'lime', texture: 'char.rival_lime_brood', anim: 'lime_brood', x: LIME_X, y: LIME_Y, flip: true, depth: 3 },
    { id: 'teal', texture: 'char.rival_teal', anim: 'teal_idle', x: NEST_X + 72, flip: true, depth: 4 },
    { id: 'grey', texture: 'char.rival_grey', anim: 'grey_idle', x: GREY_X, flip: true, depth: 4 },
    { id: 'coconut', texture: 'enemy.archid_coconut', x: 140, hidden: true, depth: 5, rolls: true },
    RIDER,
  ],
  beats: [
    riderIn(118, 1300),
    { emote: 'flo', icon: 'heart' },
    { say: 'flo', text: 'nest-boss.found' },
    { emote: 'teal', icon: 'exclaim' },
    { say: 'teal', text: 'nest-boss.thief' },
    { say: 'jj', text: 'nest-boss.boyfriend', at: 'rider' },
    { say: 'lime', text: 'nest-boss.hatching' },
    { say: 'flo', text: 'nest-boss.hours' },
    { say: 'jj', text: 'nest-boss.trade', at: 'rider' },
    { show: 'coconut' },
    { move: 'coconut', x: COCONUT_X, angle: 540, ms: 1000, ease: 'Quad.out' },
    { emote: 'grey', icon: 'question' },
    { wait: 600 },
    { say: 'grey', text: 'intro.eggIsEgg' },
    { say: 'grey', text: 'nest-boss.ours' },
    { emote: 'flo', icon: 'anger' },
    { say: 'flo', text: 'intro.bald' },
    { move: 'grey', x: (GREY_X + STOMP_X) / 2, y: GROUND_Y - 22, ms: 260, ease: 'Quad.out', anim: 'grey_glide' },
    { move: 'grey', x: STOMP_X, y: GROUND_Y, ms: 220, ease: 'Quad.in', then: 'grey_idle' },
    { sound: 'pound' },
    { shake: 220 },
    { say: 'jj', text: 'nest-boss.hold', at: 'rider' },
    { say: 'bird', text: 'nest-boss.kweh', at: 'rider' },
    { say: 'grey', text: 'nest-boss.stomped' },
    { move: 'grey', x: STOMP_X - 12, ms: 70, ease: 'Quad.out' },
    { sound: 'bonk' },
    { shake: 200 },
    { move: 'grey', x: STOMP_X, ms: 120, ease: 'Quad.in', async: true },
    { move: 'rider', x: 60, y: GROUND_Y - 22, ms: 240, ease: 'Quad.out', anim: 'hurt' },
    { move: 'rider', x: -40, y: GROUND_Y - 6, ms: 280, ease: 'Quad.in' },
    { wait: 500 },
    { caption: 'nest-boss.final', sub: LEVELS.boss.name },
  ],
};
