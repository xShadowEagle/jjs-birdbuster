import { GROUND_Y } from '../../constants';
import type { ActorSpec, Beat, CutsceneDef } from '../cutscene';
import { RIDER, levelCard, riderIn } from './beats';

const LANDING_XS = [262, 318, 374];

export const trail: CutsceneDef = {
  stage: 'meadow',
  actors: [
    RIDER,
    { id: 'feather', texture: 'item.feather', x: 212, y: -4 },
    ...LANDING_XS.map((x, i): ActorSpec => ({ id: `f${i + 1}`, texture: 'item.feather', x: x + 14, y: -4 })),
  ],
  beats: [
    riderIn(150),
    { move: 'feather', x: 200, y: 90, ms: 900, ease: 'Sine.inOut' },
    { move: 'feather', x: 180, y: 150, ms: 900, ease: 'Sine.inOut' },
    { move: 'feather', x: 188, y: GROUND_Y, ms: 700, ease: 'Sine.out' },
    { emote: 'rider', icon: 'question' },
    { wait: 400 },
    { say: 'jj', text: 'trail.find', at: 'rider' },
    { emote: 'rider', icon: 'dots', who: 'bird' },
    { wait: 900 },
    { emote: 'rider', icon: 'exclaim', who: 'bird' },
    { say: 'bird', text: 'trail.sniff', at: 'rider' },
    { sound: 'pickup' },
    { hide: 'feather' },
    ...LANDING_XS.flatMap((x, i): Beat[] => [
      { move: `f${i + 1}`, x, y: GROUND_Y, ms: 1800, ease: 'Sine.inOut', async: i < 2 },
      ...(i < 2 ? [{ wait: 300 }] : []),
    ]),
    { say: 'jj', text: 'trail.follow', at: 'rider' },
    { say: 'jj', text: 'trail.grab', at: 'rider' },
    { say: 'bird', text: 'trail.kweh', at: 'rider' },
    levelCard('l1'),
    ...LANDING_XS.flatMap((x, i): Beat[] => [
      { move: 'rider', x: x - 6, ms: i ? 210 : 400, anim: 'run' },
      { sound: 'pickup' },
      { hide: `f${i + 1}` },
    ]),
    { move: 'rider', x: 470, ms: 420, anim: 'run' },
  ],
};
