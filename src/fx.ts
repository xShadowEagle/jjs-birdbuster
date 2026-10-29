import Phaser from 'phaser';
import type { Box } from './geom';
import { frameCount, tex } from './assets/keys';
import { ANIMS } from './assets/manifest';
import { DASH, DEPTH, SWINGS, type Swing } from './constants';
import { RAINBOW } from './ui/colors';

const POP_MS = 120;
const CONE = { ahead: 33, below: 4, frameMs: 40 };
/** speed: px/s faster than the bird */
const BLAST = { ahead: 16, up: 20, speed: 160, ms: 300, box: 36 };
const BEAM = { w: 34, reach: 230, ms: 620, frameMs: 50, box: { w: 20, h: 36 } };
const rnd = Phaser.Math.FloatBetween;

type Point = { x: number; y: number };
type BirdBody = () => { right: number; bottom: number };
export interface Shot { box(): Box | null; done(): boolean }

function swingAt(s: (typeof SWINGS)[Swing], body: BirdBody, w: number): Point {
  const b = body();
  // the offsets rounded on their own: rounded with the bird's place, they would jitter a pixel
  return { x: Math.round(b.right) + Math.round(s.reach - w / 2), y: Math.round(b.bottom) - Math.round((s.top + s.bottom) / 2) };
}

const boxAround = ({ x, y }: Point, w: number, h: number): Box => ({ x: x - w / 2, y: y - h / 2, w, h });

// `k`: 0 to 1 of its time
const once = (s: Phaser.GameObjects.Sprite) => { const n = frameCount(s.texture); return (k: number) => s.setFrame(Math.min(n - 1, Math.floor(k * n))); };
const looping = (s: Phaser.GameObjects.Sprite, ms: number, frameMs: number) => { const n = frameCount(s.texture); return (k: number) => s.setFrame(Math.floor((k * ms) / frameMs) % n).setAlpha(Math.min(1, (1 - k) / 0.3)); };

export default class Fx {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly stars: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly starBurst: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene, private readonly now: () => number = () => scene.time.now) {
    this.sparks = scene.add.particles(0, 0, tex('fx.spark'), {
      emitting: false, lifespan: { min: 250, max: 450 }, speed: { min: 40, max: 110 },
      scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0.3 }, gravityY: 120,
    }).setDepth(DEPTH.sparks);
    this.dust = scene.add.particles(0, 0, tex('fx.puff'), {
      emitting: false, lifespan: { min: 200, max: 350 }, speedX: { min: -40, max: 20 }, speedY: { min: -30, max: -5 },
      scale: { start: 1, end: 0.2 }, alpha: { start: 0.9, end: 0 },
    }).setDepth(DEPTH.dust);
    const star = { tint: [...RAINBOW], scale: { start: 1, end: 0 } };
    this.stars = scene.add.particles(0, 0, tex('fx.star'), {
      ...star, emitting: false, lifespan: { min: 300, max: 550 }, speedX: { min: -50, max: -10 }, speedY: { min: -20, max: 20 },
    }).setDepth(DEPTH.sparks);
    this.starBurst = scene.add.particles(0, 0, tex('fx.star'), {
      ...star, emitting: false, lifespan: { min: 350, max: 650 }, speed: { min: 60, max: 170 }, gravityY: 90,
    }).setDepth(DEPTH.sparks);
  }

  sparkle(x: number, y: number): void { this.sparks.explode(8, x, y); }

  burst(x: number, y: number): void { this.sparks.explode(28, x, y); }

  puff(x: number, y: number, n = 4): void { this.dust.explode(n, x, y); }

  swing(kind: Swing, body: BirdBody): void {
    const s = SWINGS[kind], strike = 1000 / ANIMS[kind].fps;
    const at = (w: number) => () => swingAt(s, body, w);
    if (kind === 'cleave') {
      const fx = this.scene.add.image(0, 0, tex('fx.slash'));
      this.alongside(fx, at(fx.width), strike, s.activeMs - strike, 'Quad.out', k => { fx.setAlpha(1 - k); fx.x += Math.round(8 * k); });
    } else {
      const fx = this.scene.add.sprite(0, 0, tex('fx.peck'));
      this.alongside(fx, at(fx.width), strike, POP_MS, 'Linear', once(fx));
    }
  }

  dash(body: BirdBody, cone: 'fx.dash' | 'fx.rainbow_cone' = 'fx.dash'): void {
    const fx = this.scene.add.sprite(0, 0, tex(cone)), w = fx.width, h = fx.height;
    const at = () => { const b = body(); return { x: Math.round(b.right) + CONE.ahead - Math.round(w / 2), y: Math.round(b.bottom) + CONE.below - Math.round(h / 2) }; };
    this.alongside(fx, at, 0, DASH.ms, 'Linear', looping(fx, DASH.ms, CONE.frameMs));
  }

  aura(x: number, y: number): void { this.stars.explode(1, x, y); }

  rainbowDash(body: BirdBody, view: Phaser.GameObjects.Sprite): Shot {
    const start = this.now();
    let blastAt: (() => Point) | undefined;
    this.dash(body, 'fx.rainbow_cone');
    this.afterimages(view, RAINBOW);
    this.scene.time.addEvent({
      delay: 30, repeat: Math.floor(DASH.ms / 30) - 1,
      callback: () => this.stars.explode(2, view.x + rnd(-14, 12), view.y - rnd(4, 34)),
    });
    this.scene.time.delayedCall(DASH.ms, () => {
      const blast = this.scene.add.sprite(0, 0, tex('fx.rainbow_blast')), from = this.now();
      const thrownY = Math.round(body().bottom) - BLAST.up;    // it keeps the height it started at: the bird may jump after
      const at = () => {
        const b = body(), ahead = (BLAST.speed * (this.now() - from)) / 1000;
        return { x: Math.round(b.right) + BLAST.ahead + Math.round(ahead), y: thrownY };
      };
      this.alongside(blast, at, 0, BLAST.ms, 'Linear', once(blast));
      const { x, y } = at();
      this.starBurst.explode(18, x, y);
      this.scene.cameras.main.shake(140, 0.006);
      blastAt = at;
    });
    return {
      box: () => (blastAt ? boxAround(blastAt(), BLAST.box, BLAST.box) : null),
      done: () => this.now() > start + DASH.ms + BLAST.ms,
    };
  }

  rainbowCleave(body: BirdBody): Shot {
    const s = SWINGS.cleave, strike = 1000 / ANIMS.cleave.fps, ms = s.activeMs - strike + BEAM.ms, from = this.now() + strike;
    let thrownY: number | undefined;                    // once slashed, it keeps that height: the bird may jump after
    const at = () => {
      const now = this.now(), u = Phaser.Math.Clamp((now - from) / ms, 0, 1);
      const { x, y } = swingAt(s, body, BEAM.w);
      if (now >= from) thrownY ??= y;
      return { x: x + Math.round(BEAM.reach * u * u), y: thrownY ?? y };
    };
    const fx = this.scene.add.sprite(0, 0, tex('fx.rainbow_beam'));
    this.alongside(fx, at, strike, ms, 'Linear', looping(fx, ms, BEAM.frameMs));
    this.scene.time.delayedCall(strike, () => { const c = at(); for (let i = 0; i < 8; i++) this.stars.explode(1, c.x + rnd(-4, 12), c.y + rnd(-18, 18)); });
    this.scene.time.delayedCall(s.activeMs, () => this.scene.time.addEvent({
      delay: 25, repeat: Math.floor(BEAM.ms / 25) - 3,
      callback: () => { const p = at(); this.stars.explode(1, p.x + rnd(-8, 2), p.y + rnd(-16, 16)); },
    }));
    return {
      box: () => (this.now() < from ? null : boxAround(at(), BEAM.box.w, BEAM.box.h)),
      done: () => this.now() > from + ms,
    };
  }

  /** Placed after physics has moved the bird (POST_UPDATE), not as the tween updates: on a screen faster than 60 Hz it would lag every other frame and flicker. */
  private alongside(s: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, at: () => Point, delay: number, ms: number, ease: string, style: (k: number) => void): void {
    s.setDepth(DEPTH.fx).setVisible(false);
    const t = { k: 0 };
    const place = () => { if (!s.visible) return; const p = at(); s.setPosition(Math.round(p.x), Math.round(p.y)); style(t.k); };
    const events = this.scene.events;
    events.on(Phaser.Scenes.Events.POST_UPDATE, place);
    s.once(Phaser.GameObjects.Events.DESTROY, () => events.off(Phaser.Scenes.Events.POST_UPDATE, place));
    this.scene.tweens.add({
      targets: t, k: 1, delay, duration: ms, ease,
      onStart: () => { s.setVisible(true); place(); },
      onComplete: () => s.destroy(),
    });
  }

  afterimages(target: Phaser.GameObjects.Sprite, fills?: readonly number[], count = 6): void {
    let n = 0;
    this.scene.time.addEvent({ delay: 40, repeat: count - 1, callback: () => { if (target.active) this.ghost(target, fills?.[n++ % fills.length]); } });
  }

  ghost(target: Phaser.GameObjects.Sprite, fill?: number, alpha = 0.45, ms = 220): void {
    const ghost = this.scene.add.image(target.x, target.y, target.texture.key, target.frame.name)
      .setOrigin(target.originX, target.originY).setScale(target.scaleX, target.scaleY).setFlip(target.flipX, target.flipY)
      .setAngle(target.angle).setDepth(target.depth - 1).setAlpha(alpha);
    if (fill !== undefined) ghost.setTint(fill).setTintMode(Phaser.TintModes.FILL);
    else ghost.setTint(0x9adcff);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: ms, onComplete: () => ghost.destroy() });
  }

  squash(target: Phaser.GameObjects.Sprite, sx: number, sy: number): void {
    this.scene.tweens.killTweensOf(target);
    target.setScale(sx, sy);
    this.scene.tweens.add({ targets: target, scaleX: 1, scaleY: 1, duration: 90, ease: 'Quad.out' });
  }
}
