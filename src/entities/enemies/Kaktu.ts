import Phaser from 'phaser';
import { DEPTH, TILE } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { SHEETS, type AnimKey, type SheetKey } from '../../assets/manifest';
import Enemy, { type Arena, type Attack, type HitResult, type SpawnArena } from './Enemy';
import type { Box } from '../../geom';

interface Kind {
  sheet: SheetKey;
  run: AnimKey;
  runLit: AnimKey;
  litOffset: number;
  /** only on a kind that shoots */
  puffFrame?: number;
  box: { w: number; h: number };
  vx: number;
  hp: number;
}

const KAKTU: Kind = { sheet: 'enemy.kaktu', run: 'kaktu_run', runLit: 'kaktu_run_lit', litOffset: 5, box: { w: 10, h: 22 }, vx: -95, hp: 1 };
const SHOOTER: Kind = { ...KAKTU, puffFrame: 4 };
const BIG: Kind = { sheet: 'enemy.kaktu_big', run: 'kaktu_big_run', runLit: 'kaktu_big_run_lit', litOffset: 4, box: { w: 16, h: 32 }, vx: -70, hp: 2 };

const STAND_FRAME = 1;
const SHOOT_AT = 240;
const PUFF_MS = 450;
const NEEDLES = 3, NEEDLE_GAP_MS = 80;
const KNOCKED = { dx: 60, hop: 6, ms: 220 }, STUN_MS = 500, FLASH = { ms: 60, times: 3 };
const BELLY_DY = 2;
const MOUTH_ROW = 12;                    // from the top of the puffed-up frame

export default class Kaktu extends Enemy {
  readonly boxW: number;
  readonly boxH: number;
  private phase: 'sprint' | 'puff' | 'shoot' | 'stand' | 'dazed' = 'sprint';
  private phaseMs = 0;
  private fired = 0;
  private readonly h: number;
  private readonly lit: boolean;
  private readonly glow?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena, private readonly kind: Kind = KAKTU) {
    const h = SHEETS[kind.sheet].h;
    super(scene, x, y + TILE / 2 - h / 2, tex(kind.sheet));
    this.h = h;
    this.boxW = kind.box.w;
    this.boxH = kind.box.h;
    this.hp = kind.hp;
    this.setDepth(DEPTH.enemy);
    scene.add.existing(this);
    this.lit = !!this.carry(arena, 'firefly', BELLY_DY, DEPTH.carried, false);
    if (this.lit) {
      this.glow = scene.add.image(this.x, this.y + BELLY_DY, tex('fx.glow')).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow)
        .setScale(h / SHEETS[KAKTU.sheet].h);
      this.once(Phaser.GameObjects.Events.DESTROY, () => this.glow?.destroy());
    }
    this.run();
  }

  override step(dt: number, arena: Arena): void {
    super.step(dt, arena);
    const at = this.beside(0, BELLY_DY);
    this.glow?.setPosition(at.x, at.y);
  }

  override get box(): Box {
    const feet = this.y + this.h / 2;
    return { x: this.x - this.boxW / 2, y: feet - this.boxH, w: this.boxW, h: this.boxH };
  }

  protected move(dt: number, a: Arena): void {
    this.phaseMs += dt * 1000;
    switch (this.phase) {
      case 'sprint':
        this.x += this.kind.vx * dt;
        if (this.kind.puffFrame !== undefined && this.x - a.player.x < SHOOT_AT) this.pose('puff', this.kind.puffFrame);
        break;
      case 'puff':
        if (this.phaseMs >= PUFF_MS) this.pose('shoot', this.kind.puffFrame!);
        break;
      case 'shoot':
        for (; this.fired < NEEDLES && this.phaseMs >= this.fired * NEEDLE_GAP_MS; this.fired++) a.add(new Needle(this.scene, this.x, this.y - this.h / 2 + MOUTH_ROW));
        if (this.fired >= NEEDLES && this.phaseMs >= NEEDLES * NEEDLE_GAP_MS + 200) this.pose('stand', STAND_FRAME);
        break;
      case 'stand':
        break;
      case 'dazed':
        this.whiten(this.phaseMs < FLASH.ms * FLASH.times * 2 && Math.floor(this.phaseMs / FLASH.ms) % 2 === 0);
        if (this.phaseMs >= STUN_MS) { this.whiten(false); this.phase = 'sprint'; this.run(); }
        break;
    }
  }

  override takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    const r = super.takeHit(attack, id, arena);
    if (r === 'hurt') {
      this.pose('dazed', STAND_FRAME);
      this.scene.tweens.add({ targets: this, x: this.x + KNOCKED.dx, duration: KNOCKED.ms, ease: 'Quad.out' });
      this.scene.tweens.add({ targets: this, y: this.y - KNOCKED.hop, duration: KNOCKED.ms / 2, ease: 'Quad.out', yoyo: true });
    }
    return r;
  }

  protected override leave(a: Arena): void {
    this.scene.tweens.killTweensOf(this);
    this.stop().setFrame(STAND_FRAME);
    if (this.glow) this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 200 });
    super.leave(a);
  }

  private run(): void {
    this.play(anim(this.lit ? this.kind.runLit : this.kind.run));
  }

  private pose(phase: Kaktu['phase'], frame: number): void {
    this.phase = phase;
    this.phaseMs = 0;
    this.stop().setFrame(frame + (this.lit ? this.kind.litOffset : 0));
  }
}

export class KaktuShooter extends Kaktu {
  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena) {
    super(scene, x, y, arena, SHOOTER);
  }
}

export class KaktuBig extends Kaktu {
  constructor(scene: Phaser.Scene, x: number, y: number, arena: SpawnArena) {
    super(scene, x, y, arena, BIG);
  }
}

const NEEDLE_VX = -210;
/** Taller than the needle, so a slide doesn't clear it. */
const NEEDLE_BOX = { w: 7, h: 12 };

export class Needle extends Enemy {
  readonly boxW = NEEDLE_BOX.w;
  readonly boxH = NEEDLE_BOX.h;
  override readonly weakTo: readonly Attack[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, tex('enemy.kaktu_needle'));
    this.setFlipX(true).setDepth(DEPTH.enemy);
    scene.add.existing(this);
  }

  protected move(dt: number): void {
    this.x += NEEDLE_VX * dt;
  }
}
