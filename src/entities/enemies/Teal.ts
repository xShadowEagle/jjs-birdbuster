import Phaser from 'phaser';
import { DEPTH, GAME_W, GROUND_Y, PLAYER, type ButtonId } from '../../constants';
import { anim, tex } from '../../assets/keys';
import { TEAL_PLUCKED, type AnimKey, type SheetKey, type TealPlucked } from '../../assets/manifest';
import Enemy, { nextAttackId, secsToBird, type Arena, type Attack, type HitResult, type Meeting } from './Enemy';
import Boss, { type BossPhase } from './Boss';
import { TealEvent, emitBoss } from './bossEvents';

type TealPhase = 'descend' | 'flourish' | 'throw' | 'wait';
export const TEAL_MOVES = ['volley', 'rally', 'feint', 'finale', 'swoop'] as const;
export type TealMove = (typeof TEAL_MOVES)[number];
type VolleyMove = Exclude<TealMove, 'swoop'>;

type Throw = 'low' | 'high' | 'glint' | 'feint';
/** speed: world px/s */
const VOLLEYS: Record<VolleyMove, { throws: Throw[]; gapMs: number; speed: number; rally: number }> = {
  volley: { throws: ['low', 'low', 'glint'], gapMs: 600, speed: 110, rally: 0 },
  rally: { throws: ['low', 'high', 'low', 'glint'], gapMs: 560, speed: 120, rally: 1 },
  feint: { throws: ['low', 'feint', 'low', 'high', 'low', 'glint'], gapMs: 520, speed: 135, rally: 1 },
  finale: { throws: ['low', 'high', 'feint', 'low', 'low', 'high', 'glint'], gapMs: 480, speed: 150, rally: 2 },
};
const BY_HITS: VolleyMove[] = ['volley', 'rally', 'feint', 'finale'];
/** a swing at the feint is still cooling down as the real throw comes */
const FEINT_MS = 230;
const THROW = { sx: 290, y: 118, bob: 3, descendMs: 500, flourishMs: 650, bowMs: 300, windupMs: 240, releaseMs: 180, afterMs: 350 };
/** frames of char.boss_teal_show */
const SHOW = { tuck: 0, back: 1, fling: 2, bow: 3, up: 4 };
const WING_TIP = { dx: -27, dy: 2 };
const SPARKLE = { color: 0xbff6ee, ms: 380 };
const MOULT = { n: 6, out: 26, fall: 34, ms: 900 };
/** times the glinting feather's speed, each time she bats it back */
const SPEED_UP = 1.3;

export default class Teal extends Boss<TealPhase, TealMove> {
  private moves = 0;
  private volley = VOLLEYS.volley;
  /** ms into the throw phase */
  private throwAt: number[] = [];
  private thrown = 0;
  /** ms into this phase */
  private releasedAt = -Infinity;
  private glint?: Feather;
  private ralliesLeft = 0;
  private feathers: Feather[] = [];

  protected override meets(attack: Attack): Meeting {
    if (attack === 'feather') return 'hurt';
    return attack === 'dash' ? 'pass' : 'blocked';
  }

  protected override get openTo(): ButtonId | undefined {
    return this.phase === 'throw' || this.feathers.some(f => f.inPlay && !f.harmless) ? 'attack' : undefined;
  }

  protected override act(dt: number, a: Arena): void {
    this.feathers = this.feathers.filter(f => f.inPlay);
    switch (this.phase) {
      case 'descend':
        if (this.glideTo(THROW, THROW.descendMs)) this.go('flourish');
        break;
      case 'flourish': {
        const up = this.phaseMs >= THROW.bowMs;
        if (up && !this.holding(SHOW.up, this.showSheet())) this.sparkle();
        this.show(up ? SHOW.up : SHOW.bow);
        if (this.phaseMs >= THROW.flourishMs) this.go('throw');
        break;
      }
      case 'throw': {
        this.bob(THROW.y, THROW.bob);
        const next = this.throwAt[this.thrown];
        if (next !== undefined && this.phaseMs >= next) this.release(this.volley.throws[this.thrown++], a);
        else if (next !== undefined && this.phaseMs >= next - THROW.windupMs) this.show(this.phaseMs < next - THROW.windupMs / 2 ? SHOW.tuck : SHOW.back);
        else this.flung();
        if (next === undefined && this.phaseMs > this.releasedAt + THROW.afterMs) this.go(this.glint ? 'wait' : 'enter');
        break;
      }
      case 'wait':
        this.bob(THROW.y, THROW.bob);
        this.flung();
        if (!this.glint?.inPlay) { this.glint = undefined; this.go('enter'); }
        break;
      default:
        super.act(dt, a);
    }
  }

  private flung(): void {
    if (this.phaseMs < this.releasedAt + THROW.releaseMs) this.show(SHOW.fling);
    else if (!this.anims.isPlaying) this.play(this.pose('glide'));
  }

  private get plucked(): TealPlucked | 0 {
    return Math.min(TEAL_PLUCKED.length, this.spec.hp - this.hp) as TealPlucked | 0;
  }

  protected override sheet(): SheetKey {
    const n = this.plucked;
    return n ? tex(`char.boss_teal_plucked_${n}`) : super.sheet();
  }

  protected override showSheet(): SheetKey {
    const n = this.plucked;
    return n ? tex(`char.boss_teal_show_plucked_${n}`) : tex('char.boss_teal_show');
  }

  protected override pose(move: 'glide' | 'dash' | 'run'): AnimKey {
    const n = this.plucked;
    return n ? anim(`boss_teal_plucked_${n}_${move}`) : super.pose(move);
  }

  protected override nextMove(): void {
    const move = this.onlyMove ?? (this.moves++ % 2 === 1 ? BY_HITS[Math.min(BY_HITS.length - 1, this.spec.hp - this.hp)] : 'swoop');
    if (move === 'swoop') { this.go('windup'); return; }
    this.volley = VOLLEYS[move];
    this.ralliesLeft = this.volley.rally;
    this.throwAt = [];
    let t = THROW.windupMs;
    for (const th of this.volley.throws) {
      this.throwAt.push(t);
      t += th === 'feint' ? FEINT_MS : this.volley.gapMs;
    }
    this.thrown = 0;
    this.go('descend');
  }

  protected override go(phase: BossPhase | TealPhase): void {
    this.releasedAt = -Infinity;
    super.go(phase);
  }

  private fling(): void {
    this.releasedAt = this.phaseMs;
    this.show(SHOW.fling);
  }

  private release(th: Throw, a: Arena): void {
    this.fling();
    if (th === 'feint') return;
    const f = new Feather(this.scene, this.x + WING_TIP.dx, this.y + WING_TIP.dy, th, this.volley.speed, a.player.x, this);
    if (th === 'glint') this.glint = f;
    this.feathers.push(f);
    a.add(f);
    emitBoss(this, TealEvent.Throw);
  }

  returned(f: Feather, a: Arena): void {
    if (!this.alive) { f.gone = true; return; }
    if (this.ralliesLeft > 0) {
      this.ralliesLeft--;
      this.fling();
      f.serve(a.player.x, this.volley.speed * SPEED_UP ** (this.volley.rally - this.ralliesLeft));
      emitBoss(this, TealEvent.Bat);
      return;
    }
    f.gone = true;
    this.glint = undefined;
    this.takeHit('feather', nextAttackId(), a);
    this.moult();
    emitBoss(this, TealEvent.Struck);
  }

  private moult(): void {
    this.loseFeathers(MOULT.n, TINT.feather, (f, turn) => {
      const x = f.x + Math.cos(turn) * MOULT.out, y = f.y + Math.sin(turn) * MOULT.out * 0.6;
      this.scene.tweens.add({ targets: f, x, y, duration: MOULT.ms * 0.25, ease: 'Quad.out' });
      this.scene.tweens.add({
        targets: f, y: y + MOULT.fall, x: x + Phaser.Math.Between(-8, 8), angle: f.angle + Phaser.Math.Between(-90, 90), alpha: 0,
        delay: MOULT.ms * 0.25, duration: MOULT.ms * 0.75, ease: 'Sine.inOut', onComplete: () => f.destroy(),
      });
    });
  }

  private sparkle(): void {
    const s = this.scene.add.image(Math.round(this.x + 22), Math.round(this.y - 14), tex('fx.star')).setTint(SPARKLE.color).setDepth(DEPTH.enemy + 0.5).setScale(0.5);
    this.scene.tweens.add({ targets: s, scale: 1.6, alpha: 0, angle: 90, duration: SPARKLE.ms, ease: 'Quad.out', onComplete: () => s.destroy() });
  }
}

/** px above the bird's feet */
const HEIGHT = { low: 10, high: 37 };
const FEATHER_BOX = { w: 10, h: 6 };
const BACK_SPEED = 300;
/** the direction its tip points in the art (degrees, y down) */
const ART_DIR = -45;
const STUCK = { ms: 500, fadeMs: 300 };
const TINT = { feather: 0x5fd0c0, glint: [0xffffff, 0xfff2a0] };
/** glow: its alpha */
const SHINE = { color: 0xffd860, glow: 0.85, glowTint: 0xffb020, pulseMs: 90, twinkleMs: 120, sparkEveryMs: 35, sparkMs: 420, drift: 8 };

export class Feather extends Enemy {
  readonly boxW = FEATHER_BOX.w;
  readonly boxH = FEATHER_BOX.h;
  override readonly weakTo: readonly Attack[] = ['peck', 'cleave'];
  private vx = 0;
  private vy = 0;
  private phase: 'thrown' | 'back' | 'stuck' = 'thrown';
  private ageMs = 0;
  private stuckAt = 0;
  private deflectedBy = -1;
  private shine?: { glow: Phaser.GameObjects.Image; star: Phaser.GameObjects.Image; shed: number };

  constructor(scene: Phaser.Scene, x: number, y: number, readonly kind: Exclude<Throw, 'feint'>, speed: number, birdX: number, private readonly teal: Teal) {
    super(scene, x, y, tex('item.feather'));
    this.setDepth(DEPTH.enemy + 0.3).setTint(kind === 'glint' ? TINT.glint[0] : TINT.feather);
    this.aim(birdX, kind === 'high' ? HEIGHT.high : HEIGHT.low, speed);
    scene.add.existing(this);
    if (kind === 'glint') {
      this.shine = {
        glow: scene.add.image(x, y, tex('fx.glow')).setTint(SHINE.glowTint).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow),
        star: scene.add.image(x, y, tex('fx.star')).setTint(SHINE.color).setDepth(this.depth + 0.1),
        shed: 0,
      };
      this.once(Phaser.GameObjects.Events.DESTROY, () => { this.shine?.glow.destroy(); this.shine?.star.destroy(); });
    }
  }

  private shimmer(): void {
    const s = this.shine;
    if (!s) return;
    if (!this.inPlay) { s.glow.destroy(); s.star.destroy(); this.shine = undefined; return; }
    const { x, y } = this.beside(0, 0), beat = Math.floor(this.ageMs / SHINE.twinkleMs);
    s.glow.setPosition(x, y).setAlpha(SHINE.glow + 0.15 * Math.sin(this.ageMs / SHINE.pulseMs));
    s.star.setPosition(x, y).setAngle((beat % 2) * 45).setScale(beat % 2 ? 1 : 2);   // whole steps: the pixels stay crisp
    if (this.ageMs - s.shed < SHINE.sparkEveryMs) return;
    s.shed = this.ageMs;
    const spark = this.scene.add.image(x + Phaser.Math.Between(-4, 4), y + Phaser.Math.Between(-4, 4), tex('fx.spark'))
      .setTint(Phaser.Utils.Array.GetRandom([SHINE.color, 0xffffff])).setDepth(this.depth - 0.1);
    this.scene.tweens.add({ targets: spark, y: spark.y + SHINE.drift, alpha: 0, duration: SHINE.sparkMs, onComplete: () => spark.destroy() });
  }

  get inPlay(): boolean { return this.alive && !this.gone && this.phase !== 'stuck'; }

  override get harmless(): boolean { return this.phase !== 'thrown'; }

  private aim(birdX: number, above: number, speed: number): void {
    const secs = secsToBird(this.x, birdX, speed, 0.2);
    this.vx = -speed;
    this.vy = (GROUND_Y - above - this.y) / secs;
    this.phase = 'thrown';
    this.point(-(speed + PLAYER.runSpeed), this.vy);
  }

  serve(birdX: number, speed: number): void {
    this.aim(birdX, HEIGHT.low, speed);
  }

  private point(dx: number, dy: number): void {
    this.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)) - ART_DIR);
  }

  override step(dt: number, arena: Arena): void {
    super.step(dt, arena);
    this.shimmer();
  }

  protected move(dt: number, a: Arena): void {
    this.ageMs += dt * 1000;
    if (this.kind === 'glint') this.setTint(TINT.glint[Math.floor(this.ageMs / 80) % 2]);
    if (this.phase === 'stuck') {
      const fade = (this.ageMs - this.stuckAt - STUCK.ms) / STUCK.fadeMs;
      this.setAlpha(Phaser.Math.Clamp(1 - fade, 0, 1));
      if (fade >= 1) this.gone = true;
      return;
    }
    if (this.phase === 'back') {
      const dx = this.teal.x - this.x, dy = this.teal.y - this.y, d = Math.hypot(dx, dy);
      if (d < 14 || !this.teal.active) { this.teal.returned(this, a); return; }
      this.x += (dx / d) * BACK_SPEED * dt + PLAYER.runSpeed * dt;
      this.y += (dy / d) * BACK_SPEED * dt;
      this.point(dx, dy);
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y - 2) { this.y = GROUND_Y - 2; this.phase = 'stuck'; this.stuckAt = this.ageMs; }
    if (this.x < a.cameraRight - GAME_W - 20) this.gone = true;
  }

  override takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    if (this.phase !== 'thrown' || attack === 'dash') return null;
    if (this.kind !== 'glint') return super.takeHit(attack, id, arena);
    if (id === this.deflectedBy) return null;
    this.deflectedBy = id;
    this.phase = 'back';
    emitBoss(this.teal, TealEvent.Deflect, this.x, this.y);
    return null;
  }
}
