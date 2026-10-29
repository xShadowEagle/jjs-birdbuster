import { GROUND_Y } from '../../constants';
import type { ActorSpec, Beat, CutsceneDef } from '../cutscene';
import { LOCKS, LOCK_Y, RIDER, TOWER, TOWER_X, lockX, riderIn } from './beats';
import { RIVAL_IDS } from '../../rivals';

const KEY_DY = 2;

export const l5Nest: CutsceneDef = {
  stage: 'tower',
  music: 'nest',
  actors: [
    TOWER,
    { id: 'door', texture: 'world.tower.doorway', x: TOWER_X, depth: -1.8, hidden: true },
    ...LOCKS,
    ...RIVAL_IDS.map((r, i): ActorSpec => ({ id: `key_${r}`, texture: `item.key.${r}`, x: lockX(i), y: LOCK_Y - 12 + KEY_DY, depth: -1.4, hidden: true })),
    { id: 'inside', texture: 'item.feather', x: TOWER_X, y: GROUND_Y - 34, hidden: true },
    RIDER,
  ],
  beats: [
    riderIn(232, 1300),
    { say: 'jj', text: 'l5-nest.keys', at: 'rider' },
    ...RIVAL_IDS.flatMap((r, i): Beat[] => [
      { show: `key_${r}` },
      { wait: 220 },
      { sound: 'click' },
      { hide: `key_${r}` },
      { move: `lock_${r}`, y: GROUND_Y, angle: (i - 1) * 25 + 15, ms: 260, ease: 'Quad.in' },
      { sound: 'land' },
      { wait: 180 },
    ]),
    { wait: 300 },
    { sound: 'creak' },
    { shake: 250 },
    { show: 'door' },
    { wait: 500 },
    { emote: 'rider', icon: 'exclaim', who: 'bird' },
    { say: 'jj', text: 'l5-nest.up', at: 'rider' },
    { move: 'rider', x: TOWER_X, ms: 700, anim: 'run', ease: 'Quad.in' },
    { hide: 'rider' },
    { wait: 900 },
    { say: 'bird', text: 'l5-nest.stairs', at: 'inside' },
    { say: 'bird', text: 'l5-nest.howMany', at: 'inside' },
  ],
};
