import type Phaser from 'phaser';
import { DEPTH } from '../constants';
import { sfx } from '../audio/sfx';
import type Fx from '../fx';
import { PlayerEvent } from './Player';
import type Player from './Player';
import type Rainbow from './Rainbow';
import type { Hit } from './Enemies';
import type Boss from './enemies/Boss';
import { BossEvent, GreyEvent, LimeEvent, TealEvent, hookBoss } from './enemies/bossEvents';
import { crumble } from './enemies/breaks';

export type Sounds = (play: () => void) => void;
export const always: Sounds = play => play();

const SWOOP_GHOSTS = 14;

export function birdFeedback(scene: Phaser.Scene, p: Player, fx: Fx, rainbow: Rainbow, { sound = always, lands = () => true }: { sound?: Sounds; lands?: () => boolean } = {}): void {
  p.on(PlayerEvent.Jump, (air: boolean) => {
    sound(() => sfx.jump(air));
    fx.puff(p.x - 4, p.y, air ? 5 : 3);
    fx.squash(p.view, 0.8, 1.2);
  });
  p.on(PlayerEvent.Land, () => {
    if (!lands()) return;
    sound(sfx.land);
    fx.puff(p.x, p.y);
    fx.squash(p.view, 1.25, 0.8);
  });
  p.on(PlayerEvent.Swing, (swing: Player['swing']) => {
    if (rainbow.takesSwing()) return;
    sound(sfx[swing]);
    fx.swing(swing, () => p.body);
  });
  p.on(PlayerEvent.Dash, () => {
    scene.cameras.main.shake(80, 0.003);
    if (rainbow.takesDash()) return;
    sound(sfx.dash);
    fx.afterimages(p.view);
    fx.dash(() => p.body);
  });
}

export function hitFeedback(scene: Phaser.Scene, fx: Fx, hits: Hit[], sound: Sounds = always): void {
  for (const { x, y, result } of hits) {
    if (result === 'defeated') { fx.sparkle(x, y); scene.cameras.main.shake(60, 0.004); }
    sound(result === 'blocked' ? sfx.clang : sfx.bonk);
  }
}

export function bossFeedback(scene: Phaser.Scene, fx: Fx, boss: Boss<string>, sound: Sounds = always): void {
  const shake = (ms: number, k: number) => scene.cameras.main.shake(ms, k);
  hookBoss(boss, [
    [BossEvent.Swoop, (ghosts?: number) => fx.afterimages(boss, undefined, ghosts ?? SWOOP_GHOSTS)],
    [GreyEvent.Pound, (x: number) => { sound(sfx.pound); crumble(scene, x, DEPTH.fx); shake(160, 0.008); }],
    [TealEvent.Throw, (glint: boolean) => { sound(sfx.whoosh); if (glint) sound(sfx.ting); }],
    [TealEvent.Deflect, (x: number, y: number) => { sound(sfx.clang); fx.sparkle(x, y); shake(60, 0.004); }],
    [TealEvent.Bat, () => { sound(sfx.peck); sound(sfx.ting); }],
    [TealEvent.Struck, () => { sound(sfx.bonk); fx.sparkle(boss.x, boss.y); shake(120, 0.006); }],
    [LimeEvent.Slash, () => sound(sfx.cleave)],
    [LimeEvent.Burst, () => { sound(sfx.burst); shake(90, 0.005); }],
    [LimeEvent.CatSwoop, () => sound(sfx.whoosh)],
    [LimeEvent.Bonk, () => { sound(sfx.bonk); shake(100, 0.005); }],
    [LimeEvent.Catch, () => sound(sfx.pop)],
    [LimeEvent.Refill, (hp: number) => sound(() => sfx.pickup(hp))],
  ]);
}
