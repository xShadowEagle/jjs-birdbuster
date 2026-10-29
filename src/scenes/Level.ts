import Phaser from 'phaser';
import { BIRD_SCREEN_X, DEPTH, GAME_W, GAME_H, GROUND_Y, frameDt, RETRY_DELAY } from '../constants';
import Controls, { swingOf } from '../controls';
import Player from '../entities/Player';
import Pickups, { type Picked } from '../entities/Pickups';
import Enemies, { stepped } from '../entities/Enemies';
import BossFight, { type BossStart } from '../entities/BossFight';
import Rainbow from '../entities/Rainbow';
import { birdFeedback, bossFeedback, hitFeedback } from '../entities/feedback';
import type Boss from '../entities/enemies/Boss';
import { LimeEvent, hookBoss } from '../entities/enemies/bossEvents';
import { expectMusic, playMusic } from '../audio/music';
import { musicAt } from '../story/music';
import Track from '../track/Track';
import Backdrop from '../world/Backdrop';
import { veil } from '../world/veil';
import Fx from '../fx';
import { sfx } from '../audio/sfx';
import { LEVELS, type LevelDef, type LevelId } from '../levels';
import { GameEvent, LevelEvent, emitLevel, until, type SayEvent } from '../events';
import type { RunLine } from '../story/characters';
import { playStep, type StepData } from '../story/flow';
import { BIOMES } from '../world/biomes';
import { SCENES } from './keys';
import { keepAwake } from '../wake';
import { textureOf, type ItemId } from '../items';
import { fadeIn, leave } from './fade';
import { UI } from '../ui/colors';
import { iconOf } from '../ui/touch';
import { Wall, Web } from '../entities/enemies/Barrier';
import type Enemy from '../entities/enemies/Enemy';

export interface LevelData extends StepData {
  id: LevelId;
  from?: BossStart;
}

const WORLD_W = 1e8;
const STREAK_MS = 1200;
const INVULN_MS = 1500;
const HINT = { y: GROUND_Y - 56, r: 14, blinkMs: 320 };
const FINALE = { slow: 0.3, ms: 1300 };

export default class Level extends Phaser.Scene {
  id!: LevelId;
  def!: LevelDef;
  controls!: Controls;
  player!: Player;
  phase: 'ready' | 'running' | 'cleared' | 'failed' = 'ready';
  started = false;
  collected = 0;
  lives = 0;
  god = false;

  step = 0;
  private bossStart?: BossStart;
  rainbow!: Rainbow;
  private track!: Track;
  private pickups!: Pickups;
  private enemies!: Enemies;
  private bossFight?: BossFight;
  private backdrop!: Backdrop;
  private veil?: Phaser.GameObjects.Rectangle;
  private ceiling?: Phaser.GameObjects.TileSprite;
  private fx!: Fx;
  /** frame deltas: pauses and hidden tabs don't count */
  private runMs = 0;
  /** physics time: it stops while paused (time.now doesn't) and slows with the finale */
  clock = 0;
  private endedAt = 0;
  private invulnUntil = 0;
  private streak = 0;
  private lastPickup = -Infinity;
  private askedToCarry = 0;
  private readonly hinted = new Set<string>();

  constructor() { super(SCENES.Level); }

  /** seconds */
  get elapsed(): number { return this.runMs / 1000; }

  get birdRuns(): boolean { return this.phase === 'running' || this.phase === 'cleared'; }

  get over(): boolean { return this.phase === 'cleared' || this.phase === 'failed'; }

  readonly dev = {
    clear: () => { if (!this.over) this.clear(); },
    enemies: () => this.enemies.all,
    bosses: () => this.bossFight?.defeated ?? 0,
    layout: () => this.track.layout,
    pickups: () => this.pickups.all,
    drop: () => { if (this.def.goal) this.pickups.dropAhead(this.def.goal.item, this.player.x); },
  };

  init(data: LevelData): void {
    this.id = data.id;
    this.def = LEVELS[this.id];
    this.step = data.step;
    this.bossStart = data.from;
  }

  create(): void {
    keepAwake(true);
    // the run's state first: building the track already reads it
    this.collected = 0;
    this.askedToCarry = 0;
    this.hinted.clear();
    this.lives = this.def.lives ?? 0;
    this.slowMotion(1);
    this.runMs = 0;
    this.clock = 0;
    this.streak = 0;
    this.lastPickup = -Infinity;
    this.invulnUntil = 0;
    this.phase = 'ready';
    this.started = false;

    playMusic(this, musicAt(this.step));
    expectMusic(this.def.rainbowMusic ?? musicAt(this.step + 1));
    const biome = BIOMES[this.def.biome];
    this.backdrop = new Backdrop(this, biome);
    this.veil = veil(this, biome, DEPTH.veil);
    this.ceiling = biome.ceiling && this.add.tileSprite(0, 0, GAME_W, this.textures.get(biome.ceiling).getSourceImage().height, biome.ceiling)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ceiling);
    this.controls = new Controls(this, this.def.verbs);
    this.player = new Player(this, 48, GROUND_Y);
    this.player.canStand = () => !this.track.hurts(this.player.standingBox());
    this.pickups = new Pickups(this, kind => textureOf(kind, this.collected));
    this.enemies = new Enemies(this, { player: this.player, pickups: this.pickups, loot: only => this.loot(only) });
    this.enemies.onSpawn = e => this.hintFirst(e);
    this.track = new Track(this, biome, this.def.blocks, { pickups: this.pickups, enemies: this.enemies }, this.def.intro);
    this.pickups.landOn(this.track.ground, this.track.platforms);
    this.bossFight = this.def.bosses && new BossFight(this, this.enemies, this.def.bosses, this.bossStart, s => emitLevel(this, LevelEvent.Boss, s), boss => this.onBoss(boss));
    this.fx = new Fx(this, () => this.clock);
    this.rainbow = new Rainbow(this, this.controls, this.player, this.fx);
    this.player.swing = swingOf(this.def.verbs) ?? 'peck';
    birdFeedback(this, this.player, this.fx, this.rainbow, { lands: () => this.birdRuns });

    this.physics.world.setBounds(0, -GAME_H, WORLD_W, GAME_H * 3);
    this.physics.world.setBoundsCollision(true, false, false, false);
    this.physics.add.collider(this.player, this.track.ground);
    this.physics.add.collider(this.player, this.track.platforms);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H).startFollow(this.player, true, 1, 0, BIRD_SCREEN_X - GAME_W / 2, 0);
    fadeIn(this, 200);
    this.track.update(0);

    const onHidden = () => this.pauseRun();
    until(this, this.game.events, [[Phaser.Core.Events.HIDDEN, onHidden], [Phaser.Core.Events.BLUR, onHidden], [GameEvent.Blocked, onHidden]]);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.anims.globalTimeScale = 1;   // the whole game's: left slowed, it would slow the next scenes
      this.controls.destroy();
    });
    this.scene.launch(SCENES.HUD, { level: this });
  }

  override update(_: number, delta: number): void {
    const dt = frameDt(delta);
    this.clock += stepped(this) * 1000;
    this.controls.update();
    const pressed = this.controls.anyPressed;

    const canContinue = pressed && this.time.now > this.endedAt + RETRY_DELAY;
    if (this.phase === 'cleared') {
      if (canContinue) { this.continueStory(); return; }
    } else if (this.phase === 'failed') {
      if (canContinue) { this.restartStage(); return; }
    } else if (this.phase === 'ready' && pressed) {
      this.go();
      this.controls.dropThisFrame();
    }
    this.player.step(this.controls, this.clock, this.birdRuns);
    this.controls.dashCooldown = this.player.dashCooldown(this.clock);
    if (this.started && !this.over) this.runMs += dt * 1000;

    // Where the camera will be this frame, not last frame's scrollX: what keeps pace with it shook when frames step physics unevenly.
    const camLeft = Math.max(0, this.player.steppedX - BIRD_SCREEN_X);
    if (this.phase === 'running') {
      this.bossFight?.update(this.time.now, camLeft);   // real time: the waits between bosses were tuned through the finale's slow motion
      if (this.bossFight?.beaten) this.clear();
    }
    this.track.update(camLeft);
    this.pickups.update(camLeft);
    this.backdrop.update(camLeft, dt);
    if (this.ceiling) this.ceiling.tilePositionX = Math.round(camLeft);
    this.rainbow.update(this.clock);

    if (!this.player.dead && !this.over) {
      for (const p of this.pickups.collect(this.player.body)) this.pickup(p);
      hitFeedback(this, this.fx, this.enemies.strikes(this.player, this.rainbow, this.clock, camLeft));
      const bird = this.player.box;
      const hit = this.enemies.update(stepped(this), camLeft, this.birdRuns, bird) || this.track.hurts(bird);
      if (hit && this.phase === 'running') this.hurt();
      if (this.player.y > GAME_H + 64) this.fall();
    }
  }

  hurt(): void {
    if (!this.lives || this.player.dead || this.over || this.clock < this.invulnUntil || this.bossFight?.allDown) return;
    if (this.player.dashing(this.clock)) return;
    if (!this.god && this.loseLife() === 'failed') return;
    this.invulnUntil = this.clock + INVULN_MS;
    this.player.hurt(this.clock, INVULN_MS);
    sfx.hurt();
    this.cameras.main.shake(120, 0.006);
  }

  pauseRun(): void {
    if (this.phase !== 'running' || this.scene.isPaused()) return;
    this.scene.pause();
    emitLevel(this, LevelEvent.Pause);
  }

  resumeRun(): void {
    if (!this.scene.isPaused()) return;
    this.controls.dropAll();
    this.scene.resume();
    emitLevel(this, LevelEvent.Resume);
  }

  private continueStory(): void {
    leave(this, () => playStep(this, this.step + 1));
  }

  restartStage(): void {
    this.scene.restart({ id: this.id, step: this.step } satisfies LevelData);
  }

  quitToTitle(): void {
    playStep(this, -1);
  }

  private hintFirst(e: Enemy): void {
    const icon = e instanceof Web ? iconOf('attack', 'cleave') : e instanceof Wall ? iconOf('dash') : undefined;
    if (!icon || this.hinted.has(icon)) return;
    this.hinted.add(icon);
    const disc = this.add.circle(0, 0, HINT.r, UI.panel, 0.65).setStrokeStyle(1, UI.text, 0.5);
    const hint = this.add.container(e.x, HINT.y, [disc, this.add.image(0, 0, icon)]).setDepth(DEPTH.fx);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: HINT.blinkMs, yoyo: true, repeat: -1 });
    e.once(Phaser.GameObjects.Events.DESTROY, () => hint.destroy());
  }

  private loot(kind: ItemId): boolean {
    const goal = this.def.goal;
    if (!goal || kind !== goal.item) return false;
    return this.askedToCarry++ % (goal.oneIn ?? 1) === 0;
  }

  private go(): void {
    if (this.started && this.lives) { this.invulnUntil = this.clock + INVULN_MS; this.player.blink(INVULN_MS); }
    this.phase = 'running';
    this.started = true;
    emitLevel(this, LevelEvent.Go);
  }

  private pickup({ kind, image }: Picked): void {
    this.streak = this.clock - this.lastPickup < STREAK_MS ? this.streak + 1 : 0;
    this.lastPickup = this.clock;
    sfx.pickup(this.streak);
    this.fx.sparkle(image.x, image.y);
    this.tweens.add({ targets: image, y: image.y - 14, alpha: 0, scale: 1.8, angle: 0, duration: 260, ease: 'Quad.out', onComplete: () => image.destroy() });
    const goal = this.def.goal;
    if (!goal || kind !== goal.item) return;

    this.collected++;
    const cam = this.cameras.main;
    const { dark } = BIOMES[this.def.biome];
    if (this.veil && dark) {
      this.tweens.killTweensOf(this.veil);
      this.tweens.add({ targets: this.veil, alpha: dark.alpha * (1 - this.collected / goal.count), duration: 600 });
    }
    emitLevel(this, LevelEvent.Pickup, { item: kind, count: this.collected, goal: goal.count, x: image.x - cam.scrollX, y: image.y - cam.scrollY });
    if (this.collected >= goal.count) this.clear();
  }

  private clear(): void {
    this.phase = 'cleared';
    this.endedAt = this.time.now;
    sfx.clear();
    this.fx.burst(this.player.x + 40, this.player.y - 30);
    emitLevel(this, LevelEvent.Clear, { time: this.elapsed });
  }

  private onBoss(boss: Boss<string>): void {
    bossFeedback(this, this.fx, boss);
    hookBoss(boss, [
      [LimeEvent.Shield, (n: number) => { if (n === 1) this.jjSays('boss.huh', 1500); if (n === 2) this.jjSays('boss.notWorking', 2200); }],
      [LimeEvent.Say, (e: SayEvent) => emitLevel(this, LevelEvent.Say, e)],
      [LimeEvent.Gift, () => this.gift()],
      [LimeEvent.Finished, () => this.finishingBlow()],
    ]);
  }

  private gift(): void {
    this.rainbow.give();
    if (this.def.rainbowMusic) { playMusic(this, this.def.rainbowMusic); expectMusic(musicAt(this.step + 1)); }
    const full = this.def.lives ?? 0;
    if (this.lives && this.lives < full) {
      this.lives = full;
      emitLevel(this, LevelEvent.Lives, { lives: this.lives });
    }
    sfx.gift();
    this.cameras.main.flash(180, 255, 255, 255);
    emitLevel(this, LevelEvent.Banner, { title: 'boss.orb.got', text: 'boss.orb.name', icon: 'fx.orb', ms: 2800 });
  }

  private finishingBlow(): void {
    sfx.finale();
    this.cameras.main.flash(260, 255, 255, 255);
    this.cameras.main.shake(320, 0.012);
    this.slowMotion(FINALE.slow);
    this.time.delayedCall(FINALE.ms * FINALE.slow, () => this.slowMotion(1));   // this clock runs slowed too
  }

  /** at `k` times its speed */
  private slowMotion(k: number): void {
    this.time.timeScale = k;
    this.tweens.timeScale = k;
    this.anims.globalTimeScale = k;
    this.physics.world.timeScale = 1 / k;
  }

  private jjSays(text: RunLine, ms: number): void {
    const cam = this.cameras.main, x = Math.round(this.player.x - cam.scrollX), feet = Math.round(this.player.y - cam.scrollY);
    emitLevel(this, LevelEvent.Say, { text, x, top: feet - 40, bottom: feet, ms });
  }

  private loseLife(): 'failed' | 'continues' {
    this.lives--;
    emitLevel(this, LevelEvent.Lives, { lives: this.lives });
    if (this.lives > 0) return 'continues';
    this.phase = 'failed';
    this.endedAt = this.time.now;
    this.player.hurt(this.clock, 0);
    sfx.fail();
    emitLevel(this, LevelEvent.Fail);
    return 'failed';
  }

  private fall(): void {
    if (this.player.dead) return;
    const x = this.player.x;
    this.player.die();
    this.cameras.main.shake(150, 0.01);
    this.time.delayedCall(700, () => {
      if (!this.over && this.lives && !this.god && this.loseLife() === 'failed') return;
      this.respawn(this.track.respawnX(x));
    });
  }

  private respawn(x: number): void {
    this.player.respawn(x, GROUND_Y);
    if (this.over) return;
    this.phase = 'ready';
    emitLevel(this, LevelEvent.Ready);
  }
}
