import type Phaser from 'phaser';
import type { SayEvent } from '../../events';

export const BossEvent = { Swoop: 'swoop' } as const;
export const GreyEvent = { Pound: 'pound' } as const;
export const TealEvent = { Throw: 'teal-throw', Deflect: 'teal-deflect', Bat: 'teal-bat', Struck: 'teal-struck' } as const;
export const LimeEvent = {
  Shield: 'lime-shield', Slash: 'lime-slash', Burst: 'lime-burst',
  Say: 'lime-say', CatSwoop: 'lime-cat-swoop', Bonk: 'lime-bonk', Catch: 'lime-catch', Gift: 'lime-gift', Refill: 'lime-refill',
  Finished: 'lime-finished',
} as const;

/** x, y: world px */
export interface BossEvents {
  [BossEvent.Swoop]: [ghosts?: number];
  [GreyEvent.Pound]: [x: number];
  [TealEvent.Throw]: [glint: boolean];
  [TealEvent.Deflect]: [x: number, y: number];
  [TealEvent.Bat]: [];
  [TealEvent.Struck]: [];
  [LimeEvent.Shield]: [shields: number];
  [LimeEvent.Slash]: [];
  [LimeEvent.Burst]: [];
  [LimeEvent.Say]: [SayEvent];
  [LimeEvent.CatSwoop]: [];
  [LimeEvent.Bonk]: [];
  [LimeEvent.Catch]: [];
  [LimeEvent.Gift]: [];
  [LimeEvent.Refill]: [hp: number];
  [LimeEvent.Finished]: [];
}

export type BossHook = { [E in keyof BossEvents]: [E, (...args: BossEvents[E]) => void] }[keyof BossEvents];

export function emitBoss<E extends keyof BossEvents>(boss: Phaser.Events.EventEmitter, event: E, ...args: BossEvents[E]): void {
  boss.emit(event, ...args);
}

export function hookBoss(boss: Phaser.Events.EventEmitter, hooks: BossHook[]): void {
  for (const [event, fn] of hooks) boss.on(event, fn);
}
