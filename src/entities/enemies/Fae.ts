import type Phaser from 'phaser';
import { DEPTH, GROUND_Y } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { RIVAL_IDS } from '../../rivals';
import Enemy, { type Arena, type Attack, type HitResult, type SpawnArena } from './Enemy';
import type { Box } from '../../geom';
import { SYMBOLS } from '../../track/symbols';

const BODY_DY = 5;
const BOX = { w: 14, h: 15 };
const FLY_VX = -SYMBOLS.e.approach;       // the blocks' dash spacing counts on it
const WAVE_PX = 6, WAVE_MS = 1400;
const KEY_DY = 14;
const BLINK_DX = 44, BLINK_DY = -12;
const BLINK_MS = 160;
const LOW = GROUND_Y - 22, HIGH = GROUND_Y - 70;
const THROW_AT = 200, WINDUP_MS = 420;
const SPARK_SPEED = 170;

export default class Fae extends Enemy {
  readonly boxW = BOX.w;
  readonly boxH = BOX.h;
  override readonly weakTo: readonly Attack[] = ['dash'];
  private baseY: number;
  private waveMs: number;
  private phase: 'fly' | 'windup' | 'thrown' = 'fly';
  private wind = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena, private readonly throws = false) {
    super(scene, x, y - BODY_DY, tex('enemy.fae'));
    this.baseY = this.y;
    this.waveMs = (x % 500) / 500 * WAVE_MS;
    this.setDepth(DEPTH.enemy);
    scene.add.existing(this);
    const look = this.carry(arena, 'key', KEY_DY, DEPTH.enemy);   // made after it: held in front
    const rival = RIVAL_IDS.find(r => look === `item.key.${r}`);
    this.play(anim(rival ? `fae_hold_${rival}` : 'fae_float'));
  }

  override get box(): Box {
    return { x: this.x - this.boxW / 2, y: this.y + BODY_DY - this.boxH / 2, w: this.boxW, h: this.boxH };
  }

  protected move(dt: number, a: Arena): void {
    this.waveMs += dt * 1000;
    this.y = Math.round(this.baseY + Math.sin((this.waveMs / WAVE_MS) * Math.PI * 2) * WAVE_PX);
    if (this.phase === 'windup') {
      this.wind += dt * 1000;
      this.whiten(Math.floor(this.wind / 70) % 2 === 0);
      if (this.wind >= WINDUP_MS) { this.whiten(false); this.throwSpark(a); }
      return;
    }
    this.x += FLY_VX * dt;
    if (this.throws && this.phase === 'fly' && this.x - a.player.x < THROW_AT) this.phase = 'windup';
  }

  override takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    const r = super.takeHit(attack, id, arena);
    if (r === 'blocked') this.blink();
    return r;
  }

  private blink(): void {
    this.x += BLINK_DX;
    this.baseY = Math.max(HIGH, Math.min(LOW, this.baseY + BLINK_DY));
    this.scene.tweens.add({ targets: this, alpha: { from: 0.15, to: 1 }, duration: BLINK_MS, ease: 'Stepped', easeParams: [4] });
  }

  private throwSpark(a: Arena): void {
    this.phase = 'thrown';
    const p = a.player, tx = p.x, ty = p.y - 15;
    const sx = this.x - 6, sy = this.y + BODY_DY;
    const d = Math.hypot(tx - sx, ty - sy) || 1;
    a.add(new Spark(this.scene, sx, sy, ((tx - sx) / d) * SPARK_SPEED, ((ty - sy) / d) * SPARK_SPEED));
  }
}

export class FaeThrower extends Fae {
  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena) {
    super(scene, x, y, arena, true);
  }
}

export class Spark extends Enemy {
  readonly boxW = 5;
  readonly boxH = 5;
  override readonly weakTo: readonly Attack[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly vx: number, private readonly vy: number) {
    super(scene, x, y, tex('enemy.fae_spark'));
    this.setDepth(DEPTH.enemy);
    scene.add.existing(this);
  }

  protected move(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += 360 * dt;
    if (this.y > GROUND_Y) this.gone = true;
  }
}
