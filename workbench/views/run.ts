import type Phaser from 'phaser';
import { BIRD_BOX, BIRD_SCREEN_X, DASH, GAME_W, GAME_H, GROUND_Y, PLAYER, SWINGS, TILE, type ButtonId } from '../../src/constants';
import Enemies, { WAKE_AHEAD, stepped } from '../../src/entities/Enemies';
import type Enemy from '../../src/entities/enemies/Enemy';
import { Feather } from '../../src/entities/enemies/Teal';
import Player from '../../src/entities/Player';
import Rainbow from '../../src/entities/Rainbow';
import type Controls from '../../src/controls';
import { birdFeedback, bossFeedback, hitFeedback, type Sounds } from '../../src/entities/feedback';
import Fx from '../../src/fx';
import { overlaps, type Box } from '../../src/geom';
import { NO_PICKUPS, isBoss, makeFoeBoss, rowY, type BossKind } from '../foes';
import { state } from '../state';

const HURT = 0xff6a6a;
const RUNWAY = 1e7;
/** screen px */
const AGAIN_MS = 700;
const silent: Sounds = () => {};

export interface RunView { update(dt: number): number; destroy(): void }

function drawBoxes(g: Phaser.GameObjects.Graphics, bird: Box, attacks: (Box | null)[], foes: readonly Enemy[]): void {
  g.clear();
  if (!state.boxes) return;
  g.lineStyle(1, 0x7cff7c).strokeRect(bird.x, bird.y, bird.w, bird.h);
  for (const a of attacks) if (a) g.lineStyle(1, 0xffd35a).strokeRect(a.x, a.y, a.w, a.h);
  for (const e of foes) if (e.alive) g.lineStyle(1, 0xff5a5a).strokeRect(e.box.x, e.box.y, e.box.w, e.box.h);
}

const runnerBox = (x: number): Box => {
  const slide = state.pose === 'Slide', w = slide ? BIRD_BOX.slideW : BIRD_BOX.w, h = slide ? BIRD_BOX.slideH : BIRD_BOX.h;
  return { x: x - w / 2, y: GROUND_Y - h, w, h };
};

export class EnemiesRun implements RunView {
  private birdX = BIRD_SCREEN_X;
  private scroll = 0;
  private readonly bird: Phaser.GameObjects.Sprite;
  private readonly runner = { x: BIRD_SCREEN_X, y: GROUND_Y, box: runnerBox(BIRD_SCREEN_X), get steppedX() { return this.x; } };
  private readonly crowd: Enemies;
  private waiting = false;
  private readonly boxes: Phaser.GameObjects.Graphics;
  private readonly fx: Fx;

  constructor(private readonly scene: Phaser.Scene) {
    this.bird = scene.add.sprite(this.birdX, GROUND_Y, 'char.bird', 0).setOrigin(0.5, 1).setDepth(5)
      .play(`char.bird|${state.pose === 'Slide' ? 'slide' : 'run'}`);
    this.boxes = scene.add.graphics().setDepth(40);
    this.fx = new Fx(scene);
    this.crowd = new Enemies(scene, { player: this.runner, pickups: NO_PICKUPS, loot: () => true });
    this.spawn();
  }

  private spawn(): void {
    const f = state.foe;
    if (isBoss(f)) this.crowd.add(this.boss(f));
    else this.crowd.spawn(f, this.scroll + GAME_W + WAKE_AHEAD, rowY(f));
  }

  private boss(k: BossKind): Enemy {
    const b = makeFoeBoss(this.scene, k, this.scroll);
    bossFeedback(this.scene, this.fx, b, silent);
    return b;
  }

  update(dt: number): number {
    this.birdX += PLAYER.runSpeed * dt;
    this.scroll = this.birdX - BIRD_SCREEN_X;
    this.scene.cameras.main.setScroll(Math.round(this.scroll), 0);
    this.bird.x = this.birdX;
    this.runner.x = this.birdX;
    this.runner.box = runnerBox(this.birdX);
    const hit = this.crowd.update(dt, this.scroll, true, this.runner.box);
    this.bird.setTint(hit ? HURT : 0xffffff);
    drawBoxes(this.boxes, this.runner.box, [], this.crowd.all);
    if (!this.crowd.all.length && !this.waiting) {
      this.waiting = true;
      this.scene.time.delayedCall(AGAIN_MS, () => { this.waiting = false; this.spawn(); });
    }
    return this.scroll;
  }

  destroy(): void {}
}

export class AttacksRun implements RunView {
  private readonly player: Player;
  private readonly floor: Phaser.Physics.Arcade.Collider;
  private readonly crowd: Enemies;
  private readonly fx: Fx;
  private readonly rainbow: Rainbow;
  private readonly boxes: Phaser.GameObjects.Graphics;
  private target?: Enemy;
  private bounced = false;
  private waiting = false;
  private nextSwing = 0;
  private readonly sound: Sounds = play => { if (state.sound) play(); };

  constructor(private readonly scene: Phaser.Scene) {
    scene.physics.world.setBounds(0, -GAME_H, RUNWAY, GAME_H * 3).setBoundsCollision(true, false, false, false);
    const ground = scene.add.zone(0, GROUND_Y, RUNWAY, TILE).setOrigin(0);
    scene.physics.add.existing(ground, true);
    const p = this.player = new Player(scene, BIRD_SCREEN_X, GROUND_Y);
    p.swing = state.attack === 'cleave' || state.attack === 'rainbowCleave' ? 'cleave' : 'peck';
    this.floor = scene.physics.add.collider(p, ground);
    scene.cameras.main.setBounds(0, 0, RUNWAY, GAME_H).startFollow(p, true, 1, 0, -GAME_W * 0.2, 0);
    this.fx = new Fx(scene);
    this.rainbow = new Rainbow(scene, { rainbowCharged: new Set() }, p, this.fx, this.sound);
    birdFeedback(scene, p, this.fx, this.rainbow, { sound: this.sound });
    this.crowd = new Enemies(scene, { player: p, pickups: NO_PICKUPS, loot: () => true });
    this.boxes = scene.add.graphics().setDepth(40);
    this.spawn();
  }

  private spawn(): void {
    const t = state.target, left = this.scene.cameras.main.scrollX;
    if (!t) return;
    if (isBoss(t)) {
      const b = makeFoeBoss(this.scene, t, left);
      bossFeedback(this.scene, this.fx, b, this.sound);
      this.crowd.add(b);
    } else this.crowd.spawn(t, left + GAME_W + WAKE_AHEAD, rowY(t));
    this.target = this.crowd.all.at(-1);
    this.bounced = false;
  }

  /** Once an attack bounces off, it doesn't try again: else a Fae, blinking only a little further ahead, is pecked twice. */
  private press(now: number): Pick<Controls, 'pressed' | 'held'> {
    const p = this.player, t = this.target?.active && this.target.alive && !this.bounced ? this.target : undefined, b = p.body;
    const dash = state.attack === 'dash' || state.attack === 'rainbowDash';
    const feathers = this.crowd.all.filter(e => e instanceof Feather && e.alive && !e.harmless);
    let go = false;
    if (!state.target) go = now >= this.nextSwing;
    else if (t && dash) go = t.box.x - b.right < 40 && t.box.x + t.box.w > b.x && t.box.y < b.bottom && t.box.y + t.box.h > b.y - 4;
    else if (t || feathers.length) { const r = p.reach(); go = [t, ...feathers].some(e => e && overlaps(e.box, { ...r, w: r.w + 6 })); }
    if (go && !state.target) this.nextSwing = now + (dash ? DASH.cooldownMs : SWINGS[p.swing].cooldownMs) + 600;
    if (go && (state.attack === 'rainbowCleave' || state.attack === 'rainbowDash')) this.rainbow.give();
    const button: ButtonId = dash ? 'dash' : 'attack';
    return { pressed: (id: ButtonId) => go && id === button, held: () => false };
  }

  update(): number {
    const p = this.player, crowd = this.crowd, now = this.scene.time.now, cam = this.scene.cameras.main;
    p.step(this.press(now), now, true);
    const hits = crowd.strikes(p, this.rainbow, now, cam.scrollX);
    hitFeedback(this.scene, this.fx, hits, this.sound);
    if (hits.some(h => h.result === 'blocked')) this.bounced = true;
    const hit = crowd.update(stepped(this.scene), cam.scrollX, true, p.box) && !p.dashing(now);
    p.view.setTint(hit ? HURT : 0xffffff);
    this.rainbow.update(now);
    drawBoxes(this.boxes, p.box, [p.swingBox(now), p.dashBox(now)], crowd.all);
    if (state.target && !crowd.all.length && !this.waiting) {
      this.waiting = true;
      this.scene.time.delayedCall(AGAIN_MS, () => { this.waiting = false; this.spawn(); });
    }
    return cam.scrollX;
  }

  destroy(): void { this.floor.destroy(); }
}
