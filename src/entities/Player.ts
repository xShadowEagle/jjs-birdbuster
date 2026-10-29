import Phaser from 'phaser';
import { BIRD_BOX as B, DASH, DEPTH, PLAYER as P, SWINGS, type Swing } from '../constants';
import type Controls from '../controls';
import { SHEETS } from '../assets/manifest';
import { anim, tex } from '../assets/keys';
import type { Box } from '../geom';
import { nextAttackId } from './enemies/Enemy';

const F = SHEETS['char.bird'];

export const PlayerEvent = { Jump: 'jump', Land: 'land', Swing: 'swing', Dash: 'dash' } as const;

// Invisible: effects squash `view` instead, since Arcade scales a body with its sprite.
export default class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly view: Phaser.GameObjects.Sprite;

  dead = false;
  canStand: () => boolean = () => true;

  private coyoteUntil = 0;
  private bufferUntil = 0;
  private slideUntil = 0;
  private sliding = false;
  private jumping = false;
  private airJumps = 0;
  private gliding = false;
  private wasOnGround = true;
  private hurtUntil = 0;
  swing: Swing = 'peck';
  private swingUntil = 0;
  private swingReady = 0;
  private dashUntil = 0;
  private dashReady = 0;
  swingId = 0;
  dashId = 0;
  private blinker?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, tex('char.bird'), 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setVisible(false);
    this.view = scene.add.sprite(x, y, tex('char.bird'), 0).setOrigin(0.5, 1).setDepth(DEPTH.player);

    this.setMaxVelocity(P.runSpeed, P.maxFall);
    this.setCollideWorldBounds(true);
    this.respawn(x, y);

    // follow the body after physics has moved it this frame
    const sync = () => this.view.setPosition(Math.round(this.x), Math.round(this.y));
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    this.once(Phaser.GameObjects.Events.DESTROY, () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync); this.view.destroy(); });
  }

  // in place, so colliders bound to this sprite stay valid across deaths
  respawn(x: number, y: number): void {
    this.body.reset(x, y);
    this.body.checkCollision.none = false;
    this.setVelocity(0, 0);
    this.setSliding(false);
    this.coyoteUntil = 0;
    this.bufferUntil = 0;
    this.slideUntil = 0;
    this.jumping = false;
    this.airJumps = 0;
    this.gliding = false;
    this.dead = false;
    this.wasOnGround = true;
    this.hurtUntil = 0;
    this.swingUntil = this.swingReady = 0;
    this.endDash();
    this.dashReady = 0;
    this.blink(0);
    this.view.setPosition(x, y).setScale(1).play(anim('idle'));
  }

  hurt(time: number, blinkMs: number): void {
    this.hurtUntil = time + P.hurtMs;
    this.jumping = false; // no jump cut on the hop
    if (this.body.velocity.y > P.hurtHopVel) this.setVelocityY(P.hurtHopVel);
    this.blink(blinkMs);
  }

  /** A timer, not a tween: squash/stretch tweens would cancel it. */
  blink(ms: number): void {
    this.blinker?.remove();
    this.blinker = undefined;
    this.view.setAlpha(1);
    if (ms <= 0) return;
    const n = Math.max(1, Math.round(ms / P.blinkEveryMs));
    this.blinker = this.scene.time.addEvent({
      delay: P.blinkEveryMs, repeat: n - 1,
      callback: () => this.view.setAlpha(this.blinker?.getRepeatCount() ? (this.view.alpha < 1 ? 1 : 0.25) : 1),
    });
  }

  private setSliding(on: boolean): void {
    const w = on ? B.slideW : B.w, h = on ? B.slideH : B.h;
    this.sliding = on;
    this.body.setSize(w, h).setOffset((F.w - w) / 2, F.h - h);
  }

  get box(): Box {
    const b = this.body;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }

  /** Where x will be once Phaser moves the sprite after the scene's update; the camera follows that. */
  get steppedX(): number {
    return this.x + this.body.position.x - this.body.prevFrame.x;
  }

  standingBox(): Box {
    return { x: this.body.center.x - B.w / 2, y: this.body.bottom - B.h, w: B.w, h: B.h };
  }

  get isSliding(): boolean { return this.sliding; }

  dashing(time: number): boolean { return time < this.dashUntil; }

  /** 0 = ready, 1 = just used */
  dashCooldown(time: number): number { return Math.max(0, Math.min(1, (this.dashReady - time) / DASH.cooldownMs)); }

  reach(): Box {
    const b = this.body, s = SWINGS[this.swing];
    return { x: b.right - 4, y: b.bottom - s.top, w: s.reach + 4, h: s.top - s.bottom };
  }

  swingBox(time: number): Box | null { return time < this.swingUntil ? this.reach() : null; }

  dashBox(time: number): Box | null {
    if (!this.dashing(time)) return null;
    const b = this.body;
    return { x: b.x, y: b.y - 4, w: b.width + 10, h: b.height + 4 };
  }

  step(input: Pick<Controls, 'pressed' | 'held'>, time: number, running: boolean): void {
    if (this.dead) return;
    const body = this.body;
    // blocked.down is only reset on frames that step physics: on a faster screen it still holds just after a jump
    const onGround = body.blocked.down && body.velocity.y >= 0;
    if (onGround && !this.wasOnGround) this.emit(PlayerEvent.Land);
    this.wasOnGround = onGround;

    if (!running) {
      this.setVelocityX(0);
      this.view.play(anim(time < this.hurtUntil ? 'hurt' : 'idle'), true);
      return;
    }

    if (onGround) { this.coyoteUntil = time + P.coyoteMs; this.jumping = false; this.airJumps = 1; }
    if (input.pressed('jump')) this.bufferUntil = time + P.bufferMs;
    const wantJump = time < this.bufferUntil && time < this.coyoteUntil;

    if (input.pressed('dash') && !this.sliding && time >= this.dashReady) {
      this.dashUntil = time + DASH.ms;
      this.dashReady = time + DASH.cooldownMs;
      this.dashId = nextAttackId();
      this.swingUntil = 0;
      this.jumping = false;
      body.setAllowGravity(false);
      this.setMaxVelocity(DASH.speed, P.maxFall);
      this.emit(PlayerEvent.Dash);
    }
    if (this.dashing(time)) {
      this.setVelocity(DASH.speed, 0);
      this.view.play(anim('dash'), true);
      return;
    }
    if (this.dashUntil) this.endDash();

    this.setVelocityX(P.runSpeed);

    if (!this.sliding && onGround && input.held('slide') && !wantJump) {
      this.slideUntil = time + P.minSlideMs;
      this.setSliding(true);
    } else if (this.sliding) {
      const keep = onGround && !wantJump && (time < this.slideUntil || input.held('slide'));
      if (!keep && this.canStand()) this.setSliding(false);
    }

    if (wantJump && !this.sliding) {
      this.setVelocityY(P.jumpVel);
      this.jumping = true;
      this.bufferUntil = 0; this.coyoteUntil = 0;
      this.wasOnGround = false;
      this.emit(PlayerEvent.Jump, false);
    } else if (input.pressed('jump') && !onGround && time >= this.coyoteUntil && this.airJumps > 0) {
      this.setVelocityY(P.airJumpVel);
      this.jumping = true;
      this.airJumps--;
      this.bufferUntil = 0;
      this.emit(PlayerEvent.Jump, true);
    }
    if (input.pressed('attack') && !this.sliding && time >= this.swingReady) {
      this.swingUntil = time + SWINGS[this.swing].activeMs;
      this.swingReady = time + SWINGS[this.swing].cooldownMs;
      this.swingId = nextAttackId();
      this.view.play(anim(this.swing));
      this.emit(PlayerEvent.Swing, this.swing);
    }

    if (this.jumping && !input.held('jump') && body.velocity.y < P.jumpCutVel) this.setVelocityY(P.jumpCutVel);

    this.gliding = !onGround && input.held('jump') && body.velocity.y > 0;
    if (this.gliding && body.velocity.y > P.glideFallCap) this.setVelocityY(P.glideFallCap);

    // a swing's anim is shorter than the swing: played again it would wind up a second time
    const v = this.view;
    if (time < this.hurtUntil) v.play(anim('hurt'), true);
    else if (time < this.swingUntil) { if (v.anims.getName() !== anim(this.swing)) v.play(anim(this.swing)); }
    else if (this.sliding) v.play(anim('slide'), true);
    else if (this.gliding) v.play(anim('glide'), true);
    else if (!onGround) v.play(anim('jump'), true);
    else if (body.velocity.x > 10) v.play(anim('run'), true);
    else v.play(anim('idle'), true);
  }

  private endDash(): void {
    this.dashUntil = 0;
    this.body.setAllowGravity(true);
    this.setMaxVelocity(P.runSpeed, P.maxFall);
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.setVelocityX(0);
    this.body.checkCollision.none = true;
  }
}
