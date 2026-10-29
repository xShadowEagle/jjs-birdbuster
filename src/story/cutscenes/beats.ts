import { GROUND_Y } from '../../constants';
import { LEVELS, type LevelId } from '../../levels';
import { RIVAL_IDS } from '../../rivals';
import { FLOW } from '../flow';
import type { ActorSpec, Beat } from '../cutscene';

export const RIDER: ActorSpec = { id: 'rider', texture: 'char.bird', anim: 'run', x: -30 };

export const riderIn = (x = 170, ms = 1200): Beat => ({ move: 'rider', x, ms, anim: 'run', then: 'idle', ease: 'Quad.out' });

export const riderOut: Beat = { move: 'rider', x: 470, ms: 1300, anim: 'run', ease: 'Quad.in' };

export const levelCard = (id: LevelId): Beat => ({
  caption: 'cutscene.level',
  vars: { n: FLOW.filter(s => s.kind === 'level').findIndex(s => s.id === id) + 1 },
  sub: LEVELS[id].name,
});

export const PICNIC: ActorSpec = { id: 'picnic', texture: 'prop.picnic', x: 196 };

export const TOWER_X = 310;
export const TOWER: ActorSpec = { id: 'tower', texture: 'world.tower.gate', x: TOWER_X, depth: -2 };

const LOCK_DX = 11;
export const LOCK_Y = GROUND_Y - 14;
export const lockX = (i: number): number => TOWER_X + (i - 1) * LOCK_DX;
export const LOCKS: ActorSpec[] = RIVAL_IDS.map((r, i): ActorSpec => ({ id: `lock_${r}`, texture: `prop.lock.${r}`, x: lockX(i), y: LOCK_Y, depth: -1.5 }));

export const NEST_X = 292;
export const FLO_Y = GROUND_Y + 1;
export const FLO_IN_NEST: ActorSpec[] = [
  { id: 'flo', texture: 'char.flo', anim: 'flo_idle', x: NEST_X, y: FLO_Y, flip: true, depth: 1 },
  { id: 'nest', texture: 'prop.nest', x: NEST_X, y: GROUND_Y + 1, depth: 2 },
];
