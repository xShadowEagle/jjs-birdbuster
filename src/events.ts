import Phaser from 'phaser';
import type { ItemId } from './items';
import type { RunLine } from './story/characters';
import type { TextKey } from './texts/en';
import type { ImageKey, SheetKey } from './assets/manifest';
import type { BossState } from './entities/BossFight';

export const LevelEvent = {
  Pickup: 'pickup',
  Lives: 'lives',
  Fail: 'fail',
  Boss: 'boss',
  Clear: 'clear',
  Go: 'go',
  Ready: 'ready',
  Pause: 'pause',
  Resume: 'resume',
  Say: 'say',
  Banner: 'banner',
} as const;

export const GameEvent = {
  Blocked: 'game-blocked',
  Unblocked: 'game-unblocked',
} as const;

/** x/y: screen px */
export interface PickupEvent { item: ItemId; count: number; goal: number; x: number; y: number }
export interface LivesEvent { lives: number }
export interface ClearEvent { time: number }
export interface BannerEvent { title: TextKey; text: TextKey; icon: ImageKey | SheetKey; ms: number }
/** x (the speaker's middle), top and bottom: screen px */
export interface SayEvent { text: RunLine; x: number; top: number; bottom: number; ms: number }

export interface LevelEvents {
  [LevelEvent.Pickup]: [PickupEvent];
  [LevelEvent.Lives]: [LivesEvent];
  [LevelEvent.Fail]: [];
  [LevelEvent.Boss]: [BossState | null];
  [LevelEvent.Clear]: [ClearEvent];
  [LevelEvent.Go]: [];
  [LevelEvent.Ready]: [];
  [LevelEvent.Pause]: [];
  [LevelEvent.Resume]: [];
  [LevelEvent.Say]: [SayEvent];
  [LevelEvent.Banner]: [BannerEvent];
}

export type LevelHook = { [E in keyof LevelEvents]: [E, (...args: LevelEvents[E]) => void] }[keyof LevelEvents];

export function emitLevel<E extends keyof LevelEvents>(level: Phaser.Scene, event: E, ...args: LevelEvents[E]): void {
  level.events.emit(event, ...args);
}

/** Hooks each `[event, listener]` on `emitter` until `scene` shuts down. */
export function until(scene: Phaser.Scene, emitter: Phaser.Events.EventEmitter, hooks: [string, (...args: never[]) => void][]): void {
  for (const [event, fn] of hooks) emitter.on(event, fn);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { for (const [event, fn] of hooks) emitter.off(event, fn); });
}
