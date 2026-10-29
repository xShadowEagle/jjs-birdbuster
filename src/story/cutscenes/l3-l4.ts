import { GROUND_Y } from '../../constants';
import type { CutsceneDef } from '../cutscene';
import { RIDER, levelCard, riderIn, riderOut } from './beats';

const CAT = { x: 246, y: 51 }, COCONUT = { x: 232, y: 48 };
const RIDER_X = COCONUT.x - 12;
const CAT_SHADE = 0xa8b8b0;
const ARCHID = { x: 352, y: 150 };

export const l3l4: CutsceneDef = {
  stage: 'jungle',
  actors: [
    { id: 'f1', texture: 'item.firefly', x: -20, y: GROUND_Y - 46 },
    { id: 'f2', texture: 'item.firefly', x: -56, y: GROUND_Y - 30 },
    { id: 'f3', texture: 'item.firefly', x: 4, y: GROUND_Y - 38 },
    { id: 'cat', texture: 'char.cat', anim: 'cat_sit', x: CAT.x, y: CAT.y, flip: true, tint: CAT_SHADE },
    { id: 'coconut', texture: 'item.coconut', x: COCONUT.x, y: COCONUT.y },
    { id: 'archid', texture: 'enemy.archid', anim: 'archid_hang', x: ARCHID.x, y: -26, thread: true },
    { id: 'silk', texture: 'enemy.archid_coconut', x: ARCHID.x - 1, y: -13 },
    RIDER,
  ],
  beats: [
    { move: 'f1', x: RIDER_X - 10, y: GROUND_Y - 52, ms: 1200, ease: 'Sine.out', async: true },
    { move: 'f2', x: RIDER_X - 38, y: GROUND_Y - 36, ms: 1200, ease: 'Sine.out', async: true },
    { move: 'f3', x: RIDER_X + 46, y: GROUND_Y - 44, ms: 1200, ease: 'Sine.out', async: true },
    riderIn(RIDER_X),
    { say: 'jj', text: 'l3-l4.thanks', at: 'rider' },
    { move: 'f1', x: 90, y: -20, ms: 1500, ease: 'Sine.in', async: true },
    { move: 'f2', x: 40, y: -20, ms: 1700, ease: 'Sine.in', async: true },
    { move: 'f3', x: 150, y: -20, ms: 1400, ease: 'Sine.in' },
    { wait: 300 },
    { move: 'cat', x: CAT.x - 3, ms: 90 },
    { move: 'coconut', x: COCONUT.x - 3, angle: -90, ms: 160 },
    { move: 'cat', x: CAT.x, ms: 140, async: true },
    { move: 'coconut', x: COCONUT.x - 4, y: GROUND_Y - 34, angle: -200, ms: 560, ease: 'Quad.in' },
    { sound: 'bonk' },
    { shake: 100 },
    { emote: 'rider', icon: 'anger', who: 'bird' },
    { move: 'coconut', x: RIDER_X + 34, y: GROUND_Y, angle: 0, ms: 420, ease: 'Bounce.out' },
    { say: 'bird', text: 'l3-l4.ouch', at: 'rider' },
    { emote: 'rider', icon: 'exclaim' },
    { say: 'jj', text: 'l3-l4.eggs', at: 'rider' },
    { say: 'bird', text: 'l3-l4.what', at: 'rider' },
    { say: 'jj', text: 'l3-l4.decoys', at: 'rider' },
    { move: 'archid', y: ARCHID.y, ms: 900, ease: 'Quad.out', async: true },
    { move: 'silk', y: ARCHID.y + 13, ms: 900, ease: 'Quad.out' },
    { emote: 'rider', icon: 'exclaim', who: 'bird' },
    { say: 'jj', text: 'l3-l4.perfect', at: 'rider' },
    { move: 'archid', y: -26, ms: 500, ease: 'Quad.in', async: true },
    { move: 'silk', y: -13, ms: 500, ease: 'Quad.in' },
    { emote: 'rider', icon: 'question', who: 'bird' },
    { wait: 300 },
    { move: 'cat', x: CAT.x + 14, y: -30, ms: 380, ease: 'Quad.out' },
    { hide: 'cat' },
    { wait: 600 },
    { say: 'jj', text: 'l3-l4.sword', at: 'rider' },
    { emote: 'rider', icon: 'anger', who: 'bird' },
    { say: 'bird', text: 'l3-l4.really', at: 'rider' },
    { say: 'jj', text: 'l3-l4.cactuses', at: 'rider' },
    { play: 'rider', anim: 'cleave' },
    { sound: 'cleave' },
    { wait: 300 },
    { play: 'rider', anim: 'idle' },
    levelCard('l4'),
    riderOut,
  ],
};
