import Phaser from 'phaser';
import { DEPTH, GAME_W, GROUND_Y, PLAYER, swoopY } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { BIRD_FRAMES, type AnimKey, type SheetKey } from '../../assets/manifest';
import type { RivalId } from '../../rivals';
import Enemy, { type Arena, type Attack, type HitResult } from './Enemy';
import { BossEvent, emitBoss } from './bossEvents';

export interface BossSpec {
  rival: RivalId;
  hp: number;
  /** px/s across the screen */
  swoopSpeed: number;
  hoverMs: number;
}

/** sx: px right of the screen's left edge */
export interface Spot { sx: number; y: number }

export const FRAME_SIZE = 80;
/** low, so the box covers its lower body and trailing legs */
export const ORIGIN_Y = 0.65;
export const STAND_Y = GROUND_Y - FRAME_SIZE * (1 - ORIGIN_Y);
const HURT_FRAME = BIRD_FRAMES.hurt[0];
export const CROUCH_FRAME = BIRD_FRAMES.slide[0];
const HURT_MS = 350;
/** bobMs: ms per radian */
const HOVER = { sx: 300, y: 62, bob: 4, bobMs: 180 };
const BOX_W = 40, BOX_H = 28;
export const LOW_Y = swoopY(BOX_H, 2);
const WINDUP = { ms: 550, shiver: 2, shiverMs: 50, blinkMs: 90 };
const ENTER_MS = 900;
/** climbFrom: an sx; tilt: degrees at most */
const SWOOP = { diveMs: 380, climbFrom: 80, climbW: 150, climbH: 50, tilt: 30, stretch: 0.08 };
/** spinMs: ms per radian */
const DIZZY = { n: 3, color: 0xffe14a, spinMs: 160 };

export type BossPhase = 'enter' | 'hover' | 'windup' | 'swoop' | 'stunned';

const easeOut = (k: number): number => 1 - (1 - k) ** 2;

export default abstract class Boss<Phase extends string = never, Move extends string = string> extends Enemy {
  readonly boxW = BOX_W;
  readonly boxH = BOX_H;
  override readonly weakTo: readonly Attack[] = ['cleave', 'dash'];
  override readonly alwaysStepped = true;
  onHp?: (hp: number) => void;
  onlyMove?: Move;
  readonly beatenMs: number = 900;
  protected phase: BossPhase | Phase = 'enter';
  protected phaseMs = 0;
  /** px right of the anchor */
  protected sx: number;
  /** world x: the screen's left edge, but at the run speed during a swoop (on the camera, a dash could never close the gap) */
  protected anchor: number;
  protected fromSx = 0;
  protected fromY = 0;
  private stars: Phaser.GameObjects.Image[] = [];
  protected anger?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, cameraLeft: number, protected readonly spec: BossSpec) {
    super(scene, cameraLeft + GAME_W + 60, HOVER.y, tex(`char.boss_${spec.rival}`));
    this.sx = GAME_W + 60;
    this.anchor = cameraLeft;
    this.fromSx = this.sx;
    this.fromY = HOVER.y;
    this.hp = spec.hp;
    this.setOrigin(0.5, ORIGIN_Y).setFlipX(true).setDepth(DEPTH.enemy).play(this.pose('glide'));
    scene.add.existing(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => { this.dizzy(false); this.anger?.destroy(); });
  }

  protected move(dt: number, a: Arena): void {
    this.anchor = this.phase === 'swoop' ? this.anchor + PLAYER.runSpeed * dt : a.cameraRight - GAME_W;
    this.phaseMs += dt * 1000;
    this.act(dt, a);
    this.x = this.anchor + this.sx;
    const { dx, dy, r } = this.dizzyAt;
    this.stars.forEach((s, i) => {
      const turn = this.phaseMs / DIZZY.spinMs + (i * Math.PI * 2) / DIZZY.n, at = this.beside(dx + Math.cos(turn) * r, dy + Math.sin(turn) * 3);
      s.setPosition(at.x, at.y);
    });
    this.fume();
  }

  protected dizzy(on: boolean): void {
    for (const s of this.stars) s.destroy();
    this.stars = on ? Array.from({ length: DIZZY.n }, () => this.scene.add.image(0, 0, tex('fx.star')).setTint(DIZZY.color).setDepth(DEPTH.enemy + 0.5)) : [];
  }

  protected get dizzyAt(): { dx: number; dy: number; r: number } { return { dx: -8, dy: -38, r: 14 }; }

  protected angerMark(): Phaser.GameObjects.Image {
    return this.scene.add.image(0, 0, tex('emote.anger')).setDepth(DEPTH.enemy + 0.5);
  }

  protected fume(): void {
    if (!this.anger) return;
    const { dx, dy } = this.angerAt, at = this.beside(dx, dy);
    this.anger.setPosition(at.x, at.y);
  }

  protected get angerAt(): { dx: number; dy: number } { return { dx: -14, dy: -46 }; }

  protected act(dt: number, _a: Arena): void {
    switch (this.phase) {
      case 'enter':
      case 'stunned':
        if (this.phase === 'stunned' && this.phaseMs > HURT_MS && !this.anims.isPlaying) this.play(this.pose('glide'));
        if (this.glideHome()) this.go('hover');
        break;
      case 'hover':
        this.bob();
        if (this.phaseMs > this.hoverMs) this.nextMove();
        break;
      case 'windup':
        if (this.windUp(WINDUP.ms, HOVER.sx)) this.go('swoop');
        break;
      case 'swoop': {
        this.sx -= this.spec.swoopSpeed * dt;
        const k = Math.min(1, this.phaseMs / SWOOP.diveMs), past = Phaser.Math.Clamp((SWOOP.climbFrom - this.sx) / SWOOP.climbW, 0, 1);
        const y = this.fromY + (LOW_Y - this.fromY) * k * k - past * past * SWOOP.climbH;
        this.lean(y - this.y, dt);
        this.y = y;
        this.setScale(1 + SWOOP.stretch * (1 - k), 1 - SWOOP.stretch * (1 - k));
        if (past > 0 && this.anims.currentAnim?.key !== this.pose('glide')) this.play(this.pose('glide'));
        if (this.offLeft) this.afterSwoop();
        break;
      }
    }
  }

  protected get hoverMs(): number { return this.spec.hoverMs; }

  protected get offLeft(): boolean { return this.sx < -70; }

  protected lean(dy: number, dt: number): void {
    if (dt <= 0) return;
    const deg = Phaser.Math.RadToDeg(Math.atan2(-dy / dt, this.spec.swoopSpeed));   // facing left: nose down is anticlockwise
    this.angle += (Phaser.Math.Clamp(deg, -SWOOP.tilt, SWOOP.tilt) - this.angle) * Math.min(1, dt * 14);
  }

  protected bob(y = HOVER.y, px = HOVER.bob): void {
    this.y = y + Math.sin(this.phaseMs / HOVER.bobMs) * px;
  }

  protected glideTo(to: Spot, ms: number, ease = easeOut): boolean {
    const k = Math.min(1, this.phaseMs / ms), e = ease(k);
    this.sx = this.fromSx + (to.sx - this.fromSx) * e;
    this.y = this.fromY + (to.y - this.fromY) * e;
    return k >= 1;
  }

  protected glideHome(): boolean { return this.glideTo(HOVER, ENTER_MS); }

  protected windUp(ms: number, sx?: number): boolean {
    if (sx !== undefined) this.sx = sx + (Math.floor(this.phaseMs / WINDUP.shiverMs) % 2 ? WINDUP.shiver : -WINDUP.shiver);
    this.whiten(Math.floor(this.phaseMs / WINDUP.blinkMs) % 2 === 1);
    const over = this.phaseMs > ms;
    if (over) this.whiten(false);
    return over;
  }

  protected nextMove(): void { this.go('windup'); }

  protected afterSwoop(): void {
    this.sx = GAME_W + 60;
    this.y = HOVER.y;
    this.go('enter');
  }

  override takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    const r = super.takeHit(attack, id, arena);
    if (r === 'hurt') this.knockBack(arena);
    if (r === 'defeated') { this.hold(HURT_FRAME); this.anger?.destroy(); this.anger = undefined; }
    if (r === 'hurt' || r === 'defeated') this.onHp?.(this.hp);
    return r;
  }

  protected knockBack(arena: Arena): void {
    this.anchor = arena.cameraRight - GAME_W;
    this.sx = this.x - this.anchor + 60;
    this.go('stunned');
    this.fromY -= 30;
  }

  protected go(phase: BossPhase | Phase): void {
    this.setPhase(phase);
    this.setAngle(0).setScale(1);
    if (phase === 'swoop') { this.play(this.pose('dash')); emitBoss(this, BossEvent.Swoop); }
    else if (phase === 'stunned') this.hold(HURT_FRAME);
    else this.play(this.pose('glide'), true);
  }

  /** go(), for a phase with a pose of its own */
  protected setPhase(phase: BossPhase | Phase): void {
    this.phase = phase;
    this.phaseMs = 0;
    this.fromSx = this.sx;
    this.fromY = this.y;
  }

  protected hold(frame: number, sheet = this.sheet()): void {
    if (!this.holding(frame, sheet)) this.stop().setTexture(sheet, frame);
  }

  protected holding(frame: number, sheet = this.sheet()): boolean {
    return !this.anims.isPlaying && this.texture.key === sheet && String(this.frame.name) === String(frame);
  }

  protected show(frame: number): void {
    this.hold(frame, this.showSheet());
  }

  protected showSheet(): SheetKey {
    return this.sheet();
  }

  protected sheet(): SheetKey {
    return tex(`char.boss_${this.spec.rival}`);
  }

  protected pose(move: 'glide' | 'dash' | 'run'): AnimKey {
    return anim(`boss_${this.spec.rival}_${move}`);
  }

  /** `turn`: rad */
  protected loseFeathers(n: number, tint: number, fly: (feather: Phaser.GameObjects.Image, turn: number) => void): void {
    const x = Math.round(this.x), y = Math.round(this.y);
    for (let i = 0; i < n; i++) {
      const turn = (i / n) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      fly(this.scene.add.image(x, y, tex('item.feather')).setTint(tint).setDepth(DEPTH.enemy + 0.4).setAngle(Phaser.Math.Between(0, 359)), turn);
    }
  }
}
