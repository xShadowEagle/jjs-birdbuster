import { GROUND_Y } from '../../constants';
import type { CutsceneDef } from '../cutscene';
import { RIDER, levelCard, riderIn, riderOut } from './beats';

export const l1l2: CutsceneDef = {
  stage: 'meadow',
  actors: [
    { id: 'lime', texture: 'char.rival_lime', anim: 'lime_glide', x: 312, y: 72, scale: 0.5, depth: -1 },
    { id: 'teal', texture: 'char.rival_teal', anim: 'teal_glide', x: 334, y: 61, scale: 0.5, depth: -1 },
    { id: 'grey', texture: 'char.rival_grey', anim: 'grey_glide', x: 355, y: 68, scale: 0.5, depth: -1 },
    // before the rider, which runs past in front of it
    { id: 'note', texture: 'prop.note', x: 236, y: 20, hidden: true },
    RIDER,
  ],
  beats: [
    riderIn(),
    { say: 'jj', text: 'l1-l2.woods', at: 'rider' },
    { move: 'lime', x: 452, y: 62, ms: 1500, async: true },
    { move: 'teal', x: 474, y: 51, ms: 1500, async: true },
    { move: 'grey', x: 495, y: 58, ms: 1500, async: true },
    { show: 'note' },
    { move: 'note', x: 250, y: 80, ms: 800, ease: 'Sine.inOut' },
    { move: 'note', x: 226, y: 140, ms: 800, ease: 'Sine.inOut' },
    { move: 'note', x: 236, y: GROUND_Y, ms: 600, ease: 'Sine.out' },
    { emote: 'rider', icon: 'question' },
    { wait: 400 },
    { say: 'flo', text: 'l1-l2.note', at: 'note' },
    { say: 'jj', text: 'l1-l2.ofCourse', at: 'rider' },
    { say: 'flo', text: 'l1-l2.ps', at: 'note' },
    { say: 'jj', text: 'l1-l2.berries', at: 'rider' },
    { emote: 'rider', icon: 'heart', who: 'bird' },
    { say: 'bird', text: 'l1-l2.kweh', at: 'rider' },
    levelCard('l2'),
    riderOut,
  ],
};
