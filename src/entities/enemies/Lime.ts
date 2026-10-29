import Phaser from 'phaser';
import { DEPTH, GAME_W, GROUND_Y } from '../../constants';
import { anim, frameCount, tex } from '../../assets/keys';
import type { SheetKey } from '../../assets/manifest';
import type { Box } from '../../geom';
import { RAINBOW } from '../../ui/colors';
import type { RunLine } from '../../story/characters';
import Enemy, { type Arena, type Attack, type HitResult, type Meeting } from './Enemy';
import Boss, { CROUCH_FRAME, STAND_Y, type BossPhase, type BossSpec, type Spot } from './Boss';
import { BossEvent, LimeEvent, emitBoss } from './bossEvents';
import { BONK_AT, CAT, CAUGHT_AT, CHEST, COME_TO_AT, DONE_AT, DROP_AT, LANDED_AT, SAY2_AT, SHRIEK_AT, SMELL_AT, catAt, orbAt } from './limeCat';

type LimePhase = 'land' | 'crouch' | 'charge' | 'slashing' | 'cat';
export const LIME_MOVES = ['slash', 'charge', 'swoop'] as const;
export type LimeMove = (typeof LIME_MOVES)[number];
export const LIME_PARTS = ['p1', 'p2', 'p3'] as const;
export type LimePart = (typeof LIME_PARTS)[number];

type SlashLane = 'low' | 'high' | 'big';

const ORDER: LimeMove[] = ['swoop', 'slash', 'charge'];
/** speed: px/s across the screen; legs: times her run animation's speed */
const CHARGE = { sx: 330, landMs: 420, crouchMs: 650, speed: 270, legs: 1.8 };
const CONE = { scale: 2, ahead: 18, below: 8, frameMs: 40, ghosts: 30 };
/** spin: degrees/s at most */
const SHATTER = { flashMs: 50, cols: 3, rows: 3, speed: 120, lift: 80, spin: 540, fall: 520, ms: 520, sparks: 10, r: 46 };
const CHARGE_BOX = { w: 36, h: 64 };
const FLARE = { ms: 450, color: 0x9cff4a, flickerMs: 80 };
const SLASHES = { sx: 320, above: 8, bob: 2, gapMs: 750, afterMs: 450, windupMs: 220, poseMs: 260 };
const SLASH_Y = STAND_Y - SLASHES.above;
const LANDING: Record<Exclude<LimeMove, 'swoop'>, Spot & { then: LimePhase }> = {
  slash: { sx: SLASHES.sx, y: SLASH_Y, then: 'slashing' },
  charge: { sx: CHARGE.sx, y: STAND_Y, then: 'crouch' },
};
const SLASH_ROWS: SlashLane[][] = [
  ['low', 'high', 'low'],
  ['low', 'high', 'low', 'high'],
  ['low', 'high', 'low', 'low', 'high'],
];
const BIG_FIRST: SlashLane[] = ['big', 'low', 'high', 'low', 'low', 'high'];
/** frames of char.boss_lime_show */
const SHOW = { back: 0, low: 1, high: 2, big: 2 };
/** refillMs: per hp */
const SHIELD = { hp: 1, n: 12, r: 28, ms: 520, cycleMs: 60, cycles: 7, refillMs: 160 };
/** hover: times her hover time */
const ENRAGED = { hp: 2, hover: 0.5, gapMs: 600, reenter: 60, blinkMs: 300 };
const FINALE = { tumbleMs: 1200, rings: 3, n: 14, r: 26, feathers: 8, out: 34, beatenMs: 2600 };
const LIME_TINT = 0xa8d040;

const easeIn = (k: number): number => k * k;

export default class Lime extends Boss<LimePhase, LimeMove> {
  private part: LimePart;
  private moves = 0;
  private landFor: Exclude<LimeMove, 'swoop'> = 'charge';
  private slashed = 0;
  /** ms into this phase */
  private slashAt = -Infinity;
  private lanes = SLASH_ROWS[0];
  private shields = 0;
  private cone?: Phaser.GameObjects.Sprite;
  private catNext = false;
  private cat?: Phaser.GameObjects.Sprite;
  private orb?: Phaser.GameObjects.Sprite;
  private beats = new Set<string>();
  private giftOnArrival = false;
  private secondCharge = false;
  override readonly beatenMs = FINALE.beatenMs;

  constructor(scene: Phaser.Scene, cameraLeft: number, spec: BossSpec, part: LimePart = 'p1') {
    super(scene, cameraLeft, spec);
    this.part = part === 'p2' ? 'p1' : part;     // dev, P2: the cat comes as she arrives (it's P1 till then)
    this.catNext = part === 'p2';
    this.giftOnArrival = part === 'p3';
    this.once(Phaser.GameObjects.Events.DESTROY, () => { this.cone?.destroy(); this.cat?.destroy(); this.orb?.destroy(); });
  }

  override get harmless(): boolean { return this.phase === 'cat'; }

  get charging(): boolean { return this.phase === 'charge'; }

  private get enraged(): boolean { return this.part === 'p3' && this.hp <= ENRAGED.hp; }

  protected override get hoverMs(): number { return this.spec.hoverMs * (this.enraged ? ENRAGED.hover : 1); }

  get openToRainbow(): boolean { return this.part === 'p3' && this.phase === 'slashing'; }

  override get box(): Box {
    if (this.phase === 'crouch' || this.phase === 'charge') return { x: this.x - CHARGE_BOX.w / 2, y: GROUND_Y - CHARGE_BOX.h, w: CHARGE_BOX.w, h: CHARGE_BOX.h };
    return super.box;
  }

  protected override meets(attack: Attack): Meeting {
    if (this.phase === 'cat' || this.phase === 'stunned' || (this.part === 'p3' && this.phase === 'swoop')) return 'pass';
    if (this.part === 'p3') {
      if (this.phase === 'crouch' || this.phase === 'charge') return attack === 'rainbowDash' ? 'hurt' : 'blocked';
      return attack === 'rainbowCleave' || attack === 'rainbowDash' ? 'hurt' : attack === 'dash' ? 'pass' : 'blocked';
    }
    if (attack !== 'dash') return 'blocked';
    if (this.phase !== 'charge') return 'pass';
    return this.hp <= SHIELD.hp ? 'blocked' : 'hurt';
  }

  override takeHit(attack: Attack, id: number, arena: Arena): HitResult | null {
    const cone = this.cone;
    this.cone = undefined;                      // out of go()'s reach: a dash that lands bursts it
    const r = super.takeHit(attack, id, arena);
    if (r === 'blocked' && attack === 'dash' && this.phase === 'charge') {   // else she'd sit on the bird once the dash is over
      if (this.part === 'p1') this.shield();
      this.knockBack(arena);
    }
    if (r === 'defeated') this.finish();
    if (cone && r && (attack === 'dash' || attack === 'rainbowDash')) this.burst(cone);
    else this.cone = cone;
    return r;
  }

  private burst(cone: Phaser.GameObjects.Sprite): void {
    const s = this.scene, frame = cone.frame, k = cone.scaleX, fw = frame.width, fh = frame.height;
    const cw = Math.ceil(fw / SHATTER.cols), ch = Math.ceil(fh / SHATTER.rows);
    cone.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setDepth(DEPTH.fx);
    s.time.delayedCall(SHATTER.flashMs, () => {
      for (let c = 0; c < SHATTER.cols; c++) {
        for (let r = 0; r < SHATTER.rows; r++) {
          const mx = c * cw + cw / 2, my = r * ch + ch / 2;
          const dx = (fw / 2 - mx) * k * (cone.flipX ? 1 : -1), dy = (my - fh / 2) * k;
          const shard = s.add.image(cone.x + dx, cone.y + dy, cone.texture.key, frame.name).setScale(k)
            .setCrop(c * cw, r * ch, cw, ch).setOrigin(mx / fw, my / fh).setDepth(DEPTH.fx);   // unflipped: the crop stays in the frame's own px
          if (r === 1 && c === 1) shard.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
          const out = Math.atan2(dy, dx), v = SHATTER.speed * Phaser.Math.FloatBetween(0.6, 1.2), spin = Phaser.Math.Between(-SHATTER.spin, SHATTER.spin), secs = SHATTER.ms / 1000;
          s.tweens.add({ targets: shard, x: shard.x + Math.cos(out) * v * secs, angle: spin * secs, alpha: 0, duration: SHATTER.ms, ease: 'Linear' });
          s.tweens.add({
            targets: shard, y: shard.y + (Math.sin(out) * v - SHATTER.lift) * secs + (SHATTER.fall * secs * secs) / 2, duration: SHATTER.ms, ease: 'Quad.in',
            onComplete: () => shard.destroy(),
          });
        }
      }
      cone.destroy();
    });
    for (let i = 0; i < SHATTER.sparks; i++) {
      const turn = (i / SHATTER.sparks) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const bit = s.add.image(cone.x, cone.y, tex('fx.spark')).setDepth(DEPTH.fx + 0.1);
      s.tweens.add({ targets: bit, x: bit.x + Math.cos(turn) * SHATTER.r, y: bit.y + Math.sin(turn) * SHATTER.r * 0.7, alpha: 0, duration: SHATTER.ms * 0.7, ease: 'Quad.out', onComplete: () => bit.destroy() });
    }
    emitBoss(this, LimeEvent.Burst);
  }

  protected override act(dt: number, a: Arena): void {
    if (this.giftOnArrival) { this.giftOnArrival = false; emitBoss(this, LimeEvent.Gift); }
    switch (this.phase) {
      case 'land': {
        const to = LANDING[this.landFor];
        if (this.glideTo(to, CHARGE.landMs, easeIn)) this.go(to.then);
        break;
      }
      case 'crouch':
        this.y = STAND_Y;
        if (this.windUp(CHARGE.crouchMs, CHARGE.sx)) this.go('charge');
        break;
      case 'charge':
        this.sx -= CHARGE.speed * dt;
        this.y = STAND_Y;
        this.cone?.setPosition(this.anchor + Math.round(this.sx - CONE.ahead), Math.round(GROUND_Y + CONE.below - this.cone.displayHeight / 2))
          .setFrame(Math.floor(this.phaseMs / CONE.frameMs) % frameCount(this.cone.texture));
        if (this.offLeft) {
          this.secondCharge = this.enraged && !this.secondCharge;
          if (this.secondCharge) { this.sx = GAME_W + ENRAGED.reenter; emitBoss(this, BossEvent.Swoop, CONE.ghosts); }
          else this.afterSwoop();
        }
        break;
      case 'slashing': {
        this.bob(SLASH_Y, SLASHES.bob);
        const gap = this.enraged ? ENRAGED.gapMs : SLASHES.gapMs, lanes = this.lanes, next = FLARE.ms + this.slashed * gap;
        if (this.slashed < lanes.length && this.phaseMs >= next) this.slash(lanes[this.slashed++], a);
        const since = this.phaseMs - this.slashAt, upcoming = FLARE.ms + this.slashed * gap;
        this.fill(this.phaseMs < FLARE.ms && Math.floor(this.phaseMs / FLARE.flickerMs) % 2 === 0 && FLARE.color);
        if (since < SLASHES.poseMs) this.show(SHOW[lanes[this.slashed - 1]]);
        else if (this.slashed < lanes.length && this.phaseMs >= upcoming - SLASHES.windupMs) this.show(SHOW.back);
        else if (!this.anims.isPlaying) this.play(this.pose('glide'));
        if (this.slashed >= lanes.length && since > SLASHES.afterMs) { this.fill(false); this.go('enter'); }
        break;
      }
      case 'cat':
        this.catScene(a);
        break;
      default:
        super.act(dt, a);
    }
  }

  protected override nextMove(): void {
    const move = this.onlyMove ?? ORDER[this.moves++ % ORDER.length];
    if (move === 'swoop') this.go('windup');
    else { this.landFor = move; this.go('land'); }
  }

  protected override go(phase: BossPhase | LimePhase): void {
    if (phase === 'hover' && this.catNext) { this.catNext = false; phase = 'cat'; this.beats.clear(); }
    this.anims.timeScale = 1;
    this.cone?.destroy();
    this.cone = undefined;
    if (phase === 'slashing') { this.slashed = 0; this.slashAt = -Infinity; this.lanes = this.part === 'p3' ? BIG_FIRST : SLASH_ROWS[Math.min(SLASH_ROWS.length - 1, this.spec.hp - this.hp)]; }
    super.go(phase);
    if (phase === 'crouch') { this.hold(CROUCH_FRAME); this.secondCharge = false; }   // (a hit during her second charge left it set)
    if (phase === 'charge') {
      this.play(this.pose('run'));
      this.anims.timeScale = CHARGE.legs;
      this.cone = this.scene.add.sprite(0, 0, tex('fx.dash')).setScale(CONE.scale).setFlipX(true).setDepth(DEPTH.enemy + 0.2);
      emitBoss(this, BossEvent.Swoop, CONE.ghosts);
    }
  }

  private slash(lane: SlashLane, a: Arena): void {
    this.slashAt = this.phaseMs;
    a.add(new Slash(this.scene, this.x - 30, lane));
    emitBoss(this, LimeEvent.Slash);
  }

  protected override showSheet(): SheetKey {
    return tex('char.boss_lime_show');
  }

  private shield(): void {
    this.shields++;
    this.rainbowStars(this.x, this.y, DEPTH.enemy + 0.5);
    let n = 0;
    this.scene.time.addEvent({
      delay: SHIELD.cycleMs, repeat: SHIELD.cycles - 1,
      callback: () => { if (this.active) this.fill(++n < SHIELD.cycles && RAINBOW[n % RAINBOW.length]); },
    });
    emitBoss(this, LimeEvent.Shield, this.shields);
    if (this.shields === 2) {
      this.catNext = true;
      this.scene.time.addEvent({
        delay: SHIELD.refillMs, repeat: this.spec.hp - this.hp - 1,
        callback: () => { if (!this.alive) return; this.hp++; this.onHp?.(this.hp); emitBoss(this, LimeEvent.Refill, this.hp); },
      });
    }
  }

  protected override fume(): void {
    if (!(this.enraged && this.alive)) { this.anger?.destroy(); this.anger = undefined; return; }
    this.anger ??= this.angerMark();
    super.fume();
    this.anger.setVisible(Math.floor(this.scene.time.now / ENRAGED.blinkMs) % 2 === 0);
  }

  private finish(): void {
    const s = this.scene, x = Math.round(this.x), y = Math.round(this.y);
    this.anger?.destroy();
    this.anger = undefined;
    for (let ring = 1; ring <= FINALE.rings; ring++) {
      for (let i = 0; i < FINALE.n; i++) {
        const turn = (i / FINALE.n) * Math.PI * 2 + ring * 0.3;
        const star = s.add.image(x, y, tex('fx.star')).setTint(RAINBOW[(i + ring) % RAINBOW.length]).setDepth(DEPTH.fx).setScale(ring === 1 ? 2 : 1);
        s.tweens.add({ targets: star, x: x + Math.cos(turn) * FINALE.r * ring, y: y + Math.sin(turn) * FINALE.r * ring, alpha: 0, delay: (ring - 1) * 90, duration: SHIELD.ms * 1.4, ease: 'Quad.out', onComplete: () => star.destroy() });
      }
    }
    this.loseFeathers(FINALE.feathers, LIME_TINT, (f, turn) => {
      s.tweens.add({ targets: f, x: x + Math.cos(turn) * FINALE.out, y: y + Math.sin(turn) * FINALE.out * 0.7 + 30, angle: f.angle + Phaser.Math.Between(-160, 160), alpha: 0, duration: 1100, ease: 'Sine.out', onComplete: () => f.destroy() });
    });
    this.say('boss.lime.myEgg', 2000, this.x - this.anchor, this.y - 30, this.y + 10);
    emitBoss(this, LimeEvent.Finished);
  }

  protected override defeatTween(): Phaser.Types.Tweens.TweenBuilderConfig {
    return { targets: this, x: this.x + 150, y: this.y - 90, angle: 720, alpha: 0, duration: FINALE.tumbleMs, ease: 'Quad.out' };
  }

  private beat(id: string, at: number): boolean {
    if (this.phaseMs < at || this.beats.has(id)) return false;
    this.beats.add(id);
    return true;
  }

  /** Placed by whole pixels from the anchor: rounded together with it, the cat jittered. */
  private catScene(a: Arena): void {
    const s = this.scene, t = this.phaseMs, left = this.anchor, birdSx = a.player.steppedX - left;
    const head = { sx: this.sx - 8, y: this.y - 34 };
    const dazed = t >= BONK_AT && t < COME_TO_AT;
    this.bob();
    if (dazed) { this.y += Math.sin(t / 90) * 2; this.play(anim('boss_lime_dazed'), true); this.angle = Math.sin(t / 120) * 6; }
    else if (!this.anims.isPlaying) { this.setAngle(0); this.play(this.pose('glide')); }

    if (this.beat('in', CAT.inAt)) {
      this.cat = s.add.sprite(left + CAT.from.sx, CAT.from.y, tex('char.cat')).setDepth(DEPTH.enemy + 0.6).play(anim('cat_fly'));
      emitBoss(this, LimeEvent.CatSwoop);
    }
    const cat = this.cat;
    if (cat) {
      const p = catAt(t, head);
      cat.setPosition(left + Math.round(p.sx), Math.round(p.y)).setFlipX(t >= CAUGHT_AT && t < DROP_AT);
      if (t >= DROP_AT + CAT.offMs) { cat.destroy(); this.cat = undefined; }
    }
    if (this.beat('bonk', BONK_AT)) {
      this.dizzy(true);
      this.orb = s.add.sprite(left + this.sx, this.y, tex('fx.orb')).setDepth(DEPTH.enemy + 0.7).play(anim('orb_spin'));
      this.rainbowStars(left + this.sx, this.y, DEPTH.fx);
      emitBoss(this, LimeEvent.Bonk);
    }
    const orb = this.orb;
    if (orb) {
      const p = orbAt(t, { sx: this.sx, y: this.y }, head, cat && { sx: cat.x - left, y: cat.y }, birdSx);
      orb.setPosition(left + Math.round(p.sx), Math.round(p.y));
    }
    if (this.beat('catch', CAUGHT_AT)) emitBoss(this, LimeEvent.Catch);
    const jj = (text: RunLine, ms: number) => this.say(text, ms, birdSx, GROUND_Y - 44, GROUND_Y);
    if (this.beat('wonder', CAT.wonderAt)) jj('boss.catsFly', CAT.wonderMs);
    if (this.beat('say', CAT.sayAt) && cat) this.say('boss.cat.quip', CAT.sayMs, cat.x - left, cat.y - 12, cat.y + 10);
    if (this.beat('say2', SAY2_AT) && cat) this.say('boss.cat.take', LANDED_AT - SAY2_AT, cat.x - left, cat.y - 12, cat.y + 10);
    if (this.beat('gift', LANDED_AT)) {
      this.rainbowStars(left + birdSx, GROUND_Y - CHEST, DEPTH.fx);
      orb?.destroy();
      this.orb = undefined;
      emitBoss(this, LimeEvent.Gift);
    }
    if (this.beat('smell', SMELL_AT)) jj('boss.orb.smell', CAT.smellMs);
    if (this.beat('undazed', COME_TO_AT)) { this.dizzy(false); this.setAngle(0); this.play(this.pose('glide')); }
    if (this.beat('shriek', SHRIEK_AT)) this.say('boss.lime.giveBack', CAT.shriekMs, this.sx, this.y - 30, this.y + 10);
    if (t >= DONE_AT) { this.part = 'p3'; this.go('hover'); }
  }

  private say(text: RunLine, ms: number, sx: number, top: number, bottom: number): void {
    emitBoss(this, LimeEvent.Say, { text, ms, x: Math.round(Phaser.Math.Clamp(sx, 0, GAME_W)), top: Math.round(top), bottom: Math.round(bottom) });
  }

  private rainbowStars(x: number, y: number, depth: number): void {
    const s = this.scene;
    for (let i = 0; i < SHIELD.n; i++) {
      const turn = (i / SHIELD.n) * Math.PI * 2;
      const star = s.add.image(Math.round(x), Math.round(y), tex('fx.star')).setTint(RAINBOW[i % RAINBOW.length]).setDepth(depth);
      s.tweens.add({ targets: star, x: star.x + Math.cos(turn) * SHIELD.r, y: star.y + Math.sin(turn) * SHIELD.r, alpha: 0, duration: SHIELD.ms, ease: 'Quad.out', onComplete: () => star.destroy() });
    }
  }
}

/** speed: world px/s */
const SLASH = { speed: 60, fadeMs: 120 };
/** from, to: px above the floor */
const LANES: Record<SlashLane, { from: number; to: number; w: number; scale: [number, number] }> = {
  low: { from: 4, to: 20, w: 12, scale: [1, 1] },
  high: { from: 15, to: 63, w: 12, scale: [1, 2] },
  big: { from: 0, to: 64, w: 24, scale: [3, 3] },
};

export class Slash extends Enemy {
  readonly boxW: number;
  readonly boxH: number;

  constructor(scene: Phaser.Scene, x: number, readonly lane: SlashLane) {
    const k = LANES[lane];
    super(scene, x, GROUND_Y - (k.from + k.to) / 2, tex('fx.lime_slash'));
    this.boxW = k.w;
    this.boxH = k.to - k.from;
    this.setFlipX(true).setScale(...k.scale).setDepth(DEPTH.enemy + 0.3).setAlpha(0).play(anim('lime_slash'));
    scene.tweens.add({ targets: this, alpha: 1, duration: SLASH.fadeMs });
    scene.add.existing(this);
  }

  protected move(dt: number, a: Arena): void {
    this.x -= SLASH.speed * dt;
    if (this.x < a.cameraRight - GAME_W - 40) this.gone = true;
  }

  protected override meets(attack: Attack): 'hurt' | 'pass' {
    return attack === 'rainbowCleave' ? 'hurt' : 'pass';
  }
}
