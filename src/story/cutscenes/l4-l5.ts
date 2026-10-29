import { GROUND_Y } from '../../constants';
import type { CutsceneDef } from '../cutscene';
import { LOCKS, RIDER, TOWER, TOWER_X, levelCard, riderIn, riderOut } from './beats';

const FAE_Y = GROUND_Y - 16;

export const l4l5: CutsceneDef = {
  stage: 'tower',
  music: 'nest',
  actors: [
    TOWER,
    ...LOCKS,
    { id: 'nest', texture: 'item.feather', x: TOWER_X, y: 2, hidden: true },
    { id: 'fae', texture: 'enemy.fae', anim: 'fae_hold_grey', x: 450, y: FAE_Y, flip: true },
    RIDER,
  ],
  beats: [
    riderIn(),
    { say: 'jj', text: 'l4-l5.tower', at: 'rider' },
    { say: 'flo', text: 'l4-l5.locked', at: 'nest' },
    { emote: 'rider', icon: 'question' },
    { say: 'flo', text: 'l4-l5.keys', at: 'nest' },
    { say: 'flo', text: 'l4-l5.sitting', at: 'nest' },
    { emote: 'rider', icon: 'anger' },
    { move: 'fae', x: 190, ms: 1600, ease: 'Sine.out' },
    { play: 'rider', anim: 'cleave' },
    { sound: 'cleave' },
    { hide: 'fae' },
    { wait: 60 },
    { show: 'fae' },
    { wait: 60 },
    { hide: 'fae' },
    { move: 'fae', x: 214, y: FAE_Y - 12, ms: 0 },
    { wait: 100 },
    { show: 'fae' },
    { play: 'rider', anim: 'idle' },
    { emote: 'rider', icon: 'exclaim', who: 'bird' },
    { wait: 500 },
    { move: 'fae', x: 450, y: FAE_Y - 20, ms: 1400, ease: 'Sine.in', async: true },
    { say: 'jj', text: 'l4-l5.quick', at: 'rider' },
    { say: 'bird', text: 'l4-l5.kweh', at: 'rider' },
    levelCard('l5'),
    riderOut,
  ],
};
