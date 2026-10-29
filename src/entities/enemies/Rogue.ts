import Phaser from 'phaser';
import { DEPTH, TILE, swoopY } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { SHEETS } from '../../assets/manifest';
import Enemy, { secsToBird, type Arena, type Attack, type SpawnArena } from './Enemy';
import type { Box } from '../../geom';

const H = SHEETS['enemy.rogue'].h;
const FRAME = { crouch: 2, throw: 3, lunge: 4 };
const CREEP_VX = -18;
const LUNGE_AT = 150;
const CROUCH_MS = 420;
const LUNGE_VX = -150;
const RISE_MS = 140;
const PASS_BY = 30;
const FALL_MS = 220;
const THROW_AT = 230;
const WINDUP_MS = 380;
const THROWN_MS = 200;
const SLIP_MS = 450;
const STAND = { w: 12, h: 17 }, CROUCHED = { w: 12, h: 14 }, LEAP = { w: 14, h: 9 };
const LEAP_DY = -1.5;
const LEAP_Y = swoopY(LEAP.h, 15);

export default class Rogue extends Enemy {
  readonly boxW = STAND.w;
  readonly boxH = STAND.h;
  private phase: 'creep' | 'crouch' | 'leap' | 'land' | 'away' | 'windup' | 'thrown' = 'creep';
  private phaseMs = 0;
  private readonly standY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, _arena: SpawnArena, private readonly throws = false) {
    super(scene, x, y + TILE / 2 - H / 2, tex('enemy.rogue'));
    this.standY = this.y;
    this.setFlipX(true).setDepth(DEPTH.enemy).play(anim('rogue_creep'));
    scene.add.existing(this);
  }

  override get box(): Box {
    if (this.phase === 'leap' || this.phase === 'land') {
      return { x: this.x - LEAP.w / 2, y: this.y + LEAP_DY - LEAP.h / 2, w: LEAP.w, h: LEAP.h };
    }
    const s = this.phase === 'crouch' || this.phase === 'windup' ? CROUCHED : STAND, feet = this.y + H / 2;
    return { x: this.x - s.w / 2, y: feet - s.h, w: s.w, h: s.h };
  }

  protected move(dt: number, a: Arena): void {
    const ahead = this.x - a.player.x;
    this.phaseMs += dt * 1000;
    switch (this.phase) {
      case 'creep':
        this.x += CREEP_VX * dt;
        if (ahead < (this.throws ? THROW_AT : LUNGE_AT)) this.go(this.throws ? 'windup' : 'crouch');
        break;
      case 'crouch':
        if (this.phaseMs >= CROUCH_MS) this.go('leap');
        break;
      case 'leap': {
        this.x += LUNGE_VX * dt;
        const k = Math.min(1, this.phaseMs / RISE_MS);
        this.y = Phaser.Math.Linear(this.standY, LEAP_Y - LEAP_DY, Phaser.Math.Easing.Quadratic.Out(k));
        if (ahead < -PASS_BY) this.go('land');
        break;
      }
      case 'land': {
        this.x += (LUNGE_VX / 2) * dt;
        const k = Math.min(1, this.phaseMs / FALL_MS);
        this.y = Phaser.Math.Linear(LEAP_Y - LEAP_DY, this.standY, Phaser.Math.Easing.Quadratic.In(k));
        if (k >= 1) this.go('away');
        break;
      }
      case 'away':
        this.x += CREEP_VX * dt;
        break;
      case 'windup':
        if (this.phaseMs >= WINDUP_MS) {
          a.add(new Knife(this.scene, this.x - 8, this.standY - 1, a.player.x));
          this.go('thrown');
        }
        break;
      case 'thrown':
        if (this.phaseMs >= THROWN_MS) this.slipAway();
        break;
    }
  }

  private go(phase: Rogue['phase']): void {
    this.phase = phase;
    this.phaseMs = 0;
    if (phase === 'creep' || phase === 'away') this.play(anim('rogue_creep'));
    else this.stop().setFrame(phase === 'leap' || phase === 'land' ? FRAME.lunge : phase === 'thrown' ? FRAME.throw : FRAME.crouch);
  }

  private slipAway(): void {
    this.alive = false;
    this.setFlipX(false);
    this.scene.tweens.add({ targets: this, x: this.x + 24, y: this.y - 10, alpha: 0, duration: SLIP_MS, ease: 'Quad.out', onComplete: () => { this.gone = true; } });
  }
}

export class RogueThrower extends Rogue {
  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena) {
    super(scene, x, y, arena, true);
  }
}

const KNIFE_VX = -230;
const KNIFE_BOX = { w: 10, h: 3 };
const KNIFE_Y = swoopY(KNIFE_BOX.h, 11);
const KNIFE_SPIN = -2.5 * 2 * Math.PI;   // rad/s
const SPIN_STEP = Math.PI / 4;           // drawn in 45-degree steps, so the pixels stay crisp

class Knife extends Enemy {
  readonly boxW = KNIFE_BOX.w;
  readonly boxH = KNIFE_BOX.h;
  override readonly weakTo: readonly Attack[] = [];
  private ageS = 0;
  private spin = 0;
  private readonly drop: number;
  /** seconds */
  private readonly timeToBird: number;

  constructor(scene: Phaser.Scene, x: number, y: number, birdX: number) {
    super(scene, x, y, tex('enemy.rogue_knife'));
    this.drop = y - KNIFE_Y;
    this.timeToBird = secsToBird(x, birdX, -KNIFE_VX, 0.15);
    this.setFlipX(true).setDepth(DEPTH.enemy);
    scene.add.existing(this);
  }

  protected move(dt: number): void {
    this.ageS += dt;
    this.x += KNIFE_VX * dt;
    const k = 1 - this.ageS / this.timeToBird;
    this.y = KNIFE_Y + this.drop * k * k;
    this.spin += KNIFE_SPIN * dt;
    this.rotation = Math.round(this.spin / SPIN_STEP) * SPIN_STEP;
  }
}
