import Phaser from 'phaser';
import { DEPTH, GROUND_Y, SLIDE_HEADROOM } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { SHEETS } from '../../assets/manifest';
import Enemy, { type Arena, type SpawnArena } from './Enemy';
import type { Box } from '../../geom';

const FRAME = { fall: 2 };
const H = SHEETS['enemy.archid'].h;
const BOX_W = 16;
const TOP = -8;
const NUT_DY = 15;
const NUT_BOTTOM = NUT_DY + 7;
const LOW = GROUND_Y - SLIDE_HEADROOM - 2;
const DROP_AT = 230;
const DROP_MS = 380;
const BOB_PX = 1, BOB_MS = 900;
const SWING_DEG = 18, SWING_MS = 1800;
export const THREAD = 0xe8ecf4;
const START_Y = -40;

export default class Archid extends Enemy {
  readonly boxW = BOX_W;
  readonly boxH: number;
  private phase: 'wait' | 'drop' | 'hang' | 'swing' = 'wait';
  private phaseMs = 0;
  private readonly anchorX: number;
  private readonly hangY: number;
  private readonly thread: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, _y: number, arena: SpawnArena, swings = false) {
    super(scene, x, START_Y, tex('enemy.archid'));
    this.anchorX = x;
    const carrying = !!this.carry(arena, 'coconut', NUT_DY, DEPTH.carried, 'enemy.archid_coconut');
    const bottom = carrying ? NUT_BOTTOM : H / 2;
    this.hangY = LOW - bottom;
    this.boxH = bottom - TOP;
    this.thread = scene.add.rectangle(x, 0, 1, 0, THREAD).setOrigin(0.5, 0).setDepth(DEPTH.enemy);
    this.setDepth(DEPTH.enemy).play(anim('archid_hang'));
    scene.add.existing(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.thread.destroy());
    if (swings) { this.phase = 'swing'; this.phaseMs = (x % 600) / 600 * SWING_MS; this.swing(); this.drawThread(); }
  }

  override get box(): Box {
    return { x: this.x - this.boxW / 2, y: this.y + TOP, w: this.boxW, h: this.boxH };
  }

  protected move(dt: number, a: Arena): void {
    this.phaseMs += dt * 1000;
    if (this.phase === 'swing') this.swing();
    else if (this.phase === 'wait') {
      if (this.x - a.player.x < DROP_AT) { this.phase = 'drop'; this.phaseMs = 0; }
    } else if (this.phase === 'drop') {
      const k = Math.min(1, this.phaseMs / DROP_MS);
      this.y = Phaser.Math.Linear(START_Y, this.hangY, Phaser.Math.Easing.Back.Out(k));
      if (k >= 1) { this.phase = 'hang'; this.phaseMs = 0; }
    } else {
      this.y = this.hangY + Math.round(BOB_PX * Math.sin((this.phaseMs / BOB_MS) * Math.PI * 2));
    }
    this.drawThread();
  }

  private swing(): void {
    const len = this.hangY + H;
    const a = Phaser.Math.DegToRad(SWING_DEG) * Math.sin((this.phaseMs / SWING_MS) * Math.PI * 2);
    this.setPosition(this.anchorX + Math.sin(a) * len, -H + Math.cos(a) * len).setRotation(-a);
  }

  private drawThread(): void {
    const ax = this.anchorX, ay = this.phase === 'swing' ? -H : 0;
    const tx = this.x + Math.sin(this.rotation) * -TOP, ty = this.y + Math.cos(this.rotation) * TOP;
    this.thread.setPosition(ax, ay).setSize(1, Math.max(0, Math.hypot(tx - ax, ty - ay)))
      .setRotation(-Math.atan2(tx - ax, ty - ay));
  }

  protected override dropLoot(a: Arena): void {
    this.letGo(a.pickups, 20, 0);
  }

  protected override leave(a: Arena): void {
    this.stop().setFrame(FRAME.fall);
    this.scene.tweens.add({ targets: this.thread, scaleY: 0, duration: 260, ease: 'Quad.out' });
    super.leave(a);
  }

  protected override defeatTween(): Phaser.Types.Tweens.TweenBuilderConfig {
    return { targets: this, y: this.y + 70, angle: this.angle + 40, alpha: 0, duration: 520, ease: 'Quad.in' };
  }
}

export class ArchidSwinger extends Archid {
  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena) {
    super(scene, x, y, arena, true);
  }
}
