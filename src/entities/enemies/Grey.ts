import Phaser from 'phaser';
import { DEPTH, DIG_FLOOR, GAME_W, GROUND_Y } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { BIRD_FRAMES } from '../../assets/manifest';
import type { Box } from '../../geom';
import Enemy, { type Arena, type Attack, type HitResult, type Meeting } from './Enemy';
import Boss, { CROUCH_FRAME, LOW_Y, ORIGIN_Y, FRAME_SIZE, STAND_Y, type BossPhase, type BossSpec } from './Boss';
import { GreyEvent, emitBoss } from './bossEvents';

type GreyPhase = 'climb' | 'aim' | 'drop' | 'stuck' | 'free' | 'lift' | 'reenter';
export const GREY_MOVES = ['pound', 'swoop', 'double', 'big'] as const;
export type GreyMove = (typeof GREY_MOVES)[number];

type Point = readonly [number, number];
/** px per unit of the bird's 40 px frames: points in his frames are given in those */
const UNIT = FRAME_SIZE / 40;
const CENTRE: Point = [40 * 0.5, 40 * ORIGIN_Y];
const HEAD: Point = [10, 6];

const POUND = { sx: 330, y: 54, climbMs: 450, aimMs: 700, bigAimMs: 950, dropMs: 200, crouchMs: 120, stuckMs: 2300 };
const DROP_FRAME = BIRD_FRAMES.jump[1];
const STRETCH = 0.1, SQUASH = { k: 0.18, ms: 160 };
/** flap: times his wing frames' speed; wobble: +/- degrees */
const STUCK = { sink: 16, flap: 3, wobble: 4, wobbleMs: 70 };
const FREE = { hop: 10, ms: 260 };
const DRIFT = 100;
const STUCK_BOX = { w: 40, h: 50 };
const SHADOW = { w: 44, bigW: 64, h: 4, alpha: 0.6 };
/** speed: world px/s */
const WAVES = { small: 1, big: 5, gapMs: 150, speed: 150, range: 260 };
const DIG = { plowDx: 4, stayMs: 1200, fadeMs: 400 };
const REENTER = { sx: GAME_W - 24, windupMs: 450 };
const ANGER_MS = 900;
const HARMLESS: readonly (BossPhase | GreyPhase)[] = ['stuck', 'free', 'lift', 'stunned'];

export default class Grey extends Boss<GreyPhase, GreyMove> {
  private moves = 0;
  private swoopAgain = false;
  private big = false;
  private wavesSent = 0;
  private shadow?: Phaser.GameObjects.Ellipse;
  private dig?: { from: number; crater: Phaser.GameObjects.Image; furrow: Phaser.GameObjects.TileSprite; plow: Phaser.GameObjects.Image };

  constructor(scene: Phaser.Scene, cameraLeft: number, spec: BossSpec) {
    super(scene, cameraLeft, spec);
    this.once(Phaser.GameObjects.Events.DESTROY, () => { this.shadow?.destroy(); this.leaveDig(); });
  }

  override get harmless(): boolean { return HARMLESS.includes(this.phase); }

  override get box(): Box {
    return this.phase === 'stuck' ? { x: this.x - STUCK_BOX.w / 2, y: GROUND_Y - STUCK_BOX.h, w: STUCK_BOX.w, h: STUCK_BOX.h } : super.box;
  }

  protected override meets(attack: Attack): Meeting {
    if (this.phase === 'stuck') return super.meets(attack);
    return attack === 'dash' ? 'pass' : 'blocked';
  }

  protected override move(dt: number, a: Arena): void {
    super.move(dt, a);
    this.shadow?.setX(this.x);
    if (this.dig) {
      this.dig.furrow.width = Math.max(0, Math.round(this.x - this.dig.from));
      this.dig.plow.setX(this.beside(DIG.plowDx, 0).x);
    }
    const floorRow = GROUND_Y - (this.y - this.originY * FRAME_SIZE);
    if (floorRow < FRAME_SIZE) this.setCrop(0, 0, FRAME_SIZE, Math.max(0, Math.round(floorRow)));
    else if (this.isCropped) this.setCrop();
  }

  protected override act(dt: number, a: Arena): void {
    switch (this.phase) {
      case 'climb':
        if (this.glideTo(POUND, POUND.climbMs)) this.go('aim');
        break;
      case 'aim': {
        const k = Math.min(1, this.phaseMs / (this.big ? POUND.bigAimMs : POUND.aimMs));
        this.sx = POUND.sx + (k > 0.6 && Math.floor(this.phaseMs / 50) % 2 ? 1 : 0);
        this.shade(k);
        if (k >= 1) this.go('drop');
        break;
      }
      case 'drop': {
        const k = Math.min(1, this.phaseMs / POUND.dropMs);
        this.y = POUND.y + (STAND_Y - POUND.y) * k * k;
        if (k >= 1) this.go('stuck');
        break;
      }
      case 'stuck': {
        this.sx -= DRIFT * dt;
        const sunk = this.phaseMs < POUND.crouchMs ? 0 : Math.min(1, (this.phaseMs - POUND.crouchMs) / POUND.crouchMs);
        this.y = STAND_Y + STUCK.sink * sunk;
        if (this.phaseMs >= POUND.crouchMs && !this.anims.isPlaying) {
          this.setFlipX(false).play(this.pose('glide'));
          this.anims.timeScale = STUCK.flap;
        }
        this.angle = this.phaseMs < POUND.crouchMs ? 0 : Math.sin(this.phaseMs / STUCK.wobbleMs) * STUCK.wobble;
        while (this.wavesSent < (this.big ? WAVES.big : WAVES.small) && this.phaseMs >= this.wavesSent * WAVES.gapMs) {
          const x = this.anchor + this.sx;
          a.add(new Shockwave(this.scene, x - STUCK_BOX.w / 2, -1));
          a.add(new Shockwave(this.scene, x + STUCK_BOX.w / 2, 1));
          this.wavesSent++;
        }
        if (this.phaseMs > POUND.stuckMs) this.go('free');
        break;
      }
      case 'free': {
        const k = Math.min(1, this.phaseMs / FREE.ms);
        this.y = this.fromY - (STUCK.sink + FREE.hop) * Math.sin(k * Math.PI * 0.5);
        if (k >= 1) this.go('lift');
        break;
      }
      case 'lift':
        if (this.glideHome()) this.go('hover');
        break;
      case 'reenter':
        this.sx = REENTER.sx;
        this.y = LOW_Y;
        if (this.windUp(REENTER.windupMs)) this.go('swoop');
        break;
      default:
        super.act(dt, a);
    }
  }

  protected override nextMove(): void {
    const pound = this.hp === 1 ? 'big' : 'pound', swoop = this.hp < this.spec.hp ? 'double' : 'swoop';
    const move = this.onlyMove ?? (this.moves++ % 2 === 1 ? pound : swoop);
    if (move === 'pound' || move === 'big') { this.big = move === 'big'; this.go('climb'); }
    else { this.swoopAgain = move === 'double'; this.go('windup'); }
  }

  protected override afterSwoop(): void {
    if (!this.swoopAgain) { super.afterSwoop(); return; }
    this.swoopAgain = false;
    this.go('reenter');
  }

  override takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    const r = super.takeHit(attack, id, arena);
    if (r === 'hurt') this.flashAnger();
    if (r === 'defeated') { this.dizzy(false); this.leaveDig(); this.setCrop(); }
    return r;
  }

  protected override go(phase: BossPhase | GreyPhase): void {
    if (this.phase === 'stuck') { this.dizzy(false); this.leaveDig(); this.setFlipX(true); }
    this.anims.timeScale = 1;
    switch (phase) {
      case 'drop': this.setPhase(phase); this.stop().setFrame(DROP_FRAME).setScale(1 - STRETCH, 1 + STRETCH); break;
      case 'stuck': this.setPhase(phase); this.land(); break;
      case 'free': this.setPhase(phase); this.setAngle(0); this.play(this.pose('glide')); break;
      default: super.go(phase);
    }
  }

  private land(): void {
    this.shadow?.setVisible(false);
    this.y = STAND_Y;
    this.stop().setFrame(CROUCH_FRAME);
    const x = Math.round(this.x), originY = (key: 'fx.crater' | 'fx.furrow' | 'fx.plow', row: number) => row / this.scene.textures.getFrame(tex(key)).height;
    this.dig = {
      from: x,
      crater: this.scene.add.image(x, GROUND_Y, tex('fx.crater')).setOrigin(0.5, originY('fx.crater', DIG_FLOOR.crater)).setDepth(DEPTH.plank + 0.2),
      furrow: this.scene.add.tileSprite(x, GROUND_Y, 0, this.scene.textures.getFrame(tex('fx.furrow')).height, tex('fx.furrow'))
        .setOrigin(0, originY('fx.furrow', DIG_FLOOR.furrow)).setDepth(DEPTH.plank + 0.1),
      plow: this.scene.add.image(x + DIG.plowDx, GROUND_Y, tex('fx.plow')).setOrigin(0, originY('fx.plow', DIG_FLOOR.plow)).setDepth(DEPTH.enemy + 0.2),
    };
    this.setScale(1 + SQUASH.k, 1 - SQUASH.k);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: SQUASH.ms, ease: 'Back.out' });
    this.wavesSent = 0;
    this.dizzy(true);
    emitBoss(this, GreyEvent.Pound, this.x);
  }

  /** `p` as drawn, facing left */
  private inWorld(p: Point): { x: number; y: number } {
    const x = (this.flipX ? p[0] - CENTRE[0] : CENTRE[0] - p[0]) * UNIT, y = (p[1] - CENTRE[1]) * UNIT, r = this.rotation;
    return { x: this.x + x * Math.cos(r) - y * Math.sin(r), y: this.y + x * Math.sin(r) + y * Math.cos(r) };
  }

  private leaveDig(): void {
    const d = this.dig;
    if (!d) return;
    this.dig = undefined;
    const parts = [d.crater, d.furrow, d.plow];
    d.crater.scene.tweens.add({ targets: parts, alpha: 0, delay: DIG.stayMs, duration: DIG.fadeMs, onComplete: () => parts.forEach(p => p.destroy()) });
  }

  private shade(k: number): void {
    this.shadow ??= this.scene.add.ellipse(0, GROUND_Y + SHADOW.h / 2, 1, SHADOW.h, 0x000000).setDepth(DEPTH.plank);
    this.shadow.setVisible(true).setSize(Math.round((this.big ? SHADOW.bigW : SHADOW.w) * (0.3 + 0.7 * k)), SHADOW.h).setAlpha(SHADOW.alpha * (0.3 + 0.7 * k));
  }

  protected override get dizzyAt(): { dx: number; dy: number; r: number } {
    const head = this.inWorld(HEAD);
    return { dx: head.x - this.x, dy: head.y - this.y - 6, r: 12 };
  }

  protected override get angerAt(): { dx: number; dy: number } {
    const head = this.inWorld(HEAD);
    return { dx: head.x - this.x, dy: head.y - this.y - 14 };
  }

  private flashAnger(): void {
    this.anger?.destroy();
    const mark = this.anger = this.angerMark();
    this.fume();
    this.scene.time.delayedCall(ANGER_MS, () => {
      mark.destroy();
      if (this.anger === mark) this.anger = undefined;
    });
  }
}

export class Shockwave extends Enemy {
  readonly boxW = 22;
  readonly boxH = 10;
  private rolled = 0;

  constructor(scene: Phaser.Scene, x: number, readonly dir: -1 | 1) {
    super(scene, x, GROUND_Y + 1, tex('fx.shockwave'));
    this.setOrigin(0.5, 1).setFlipX(dir > 0).setDepth(DEPTH.enemy).play(anim('shockwave_roll'));
    scene.add.existing(this);
  }

  override get box(): Box {
    return { x: this.x - this.boxW / 2, y: GROUND_Y - this.boxH, w: this.boxW, h: this.boxH };
  }

  protected move(dt: number): void {
    this.x += this.dir * WAVES.speed * dt;
    this.rolled += WAVES.speed * dt;
    this.setAlpha(Math.min(1, (WAVES.range - this.rolled) / 40));
    if (this.rolled >= WAVES.range) this.gone = true;
  }

  protected override meets(): 'pass' { return 'pass'; }
}
