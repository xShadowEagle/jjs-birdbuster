import type Phaser from 'phaser';
import { FLOW, continueAt, restartAt, sceneOf, stepOf, type FlowScene } from '../story/flow';
import { LEVELS, type LevelId } from '../levels';
import { SCENES } from '../scenes/keys';
import { LevelEvent, type LivesEvent } from '../events';
import type Level from '../scenes/Level';
import type Cutscene from '../scenes/Cutscene';
import { language } from '../language';
import { EN } from '../texts/en';
import type { CutsceneId } from '../story/cutscenes';
import type { Beat } from '../story/cutscene';
import type Controls from '../controls';
import type { KeyName } from '../controls';
import { Shockwave } from '../entities/enemies/Grey';
import { Feather } from '../entities/enemies/Teal';
import Lime, { Slash } from '../entities/enemies/Lime';
import { Needle } from '../entities/enemies/Kaktu';
import Archid from '../entities/enemies/Archid';
import Fae, { Spark } from '../entities/enemies/Fae';
import type Enemy from '../entities/enemies/Enemy';
import { BIRD_BOX } from '../constants';
import { Wall } from '../entities/enemies/Barrier';
import { isSoundMuted, setSoundMuted } from '../audio/settings';
import { saveBeaten, saveStepId, savedBeaten, savedStepId } from '../save';
import { overlaps } from '../geom';

const FRAME_MS = 1000 / 60;

export interface LevelRun { id: LevelId; ok: boolean; line: string }
export interface Check { name: string; ok: boolean; detail: string }

/** Tweens run on Date.now(), so that follows the stepped clock until release(). */
class Stepper {
  private t = performance.now();
  private readonly realDateNow = Date.now;
  private readonly wasRunning: boolean;
  private readonly wasMuted = isSoundMuted();
  private readonly wasAt = savedStepId();
  private readonly wasBeaten = savedBeaten();

  constructor(readonly game: Phaser.Game) {
    this.wasRunning = game.loop.running;
    game.loop.sleep();
    const offset = Date.now() - this.t;
    Date.now = () => Math.round(offset + this.t);
    setSoundMuted(true, false);
  }

  frames(n: number, until?: () => boolean): number {
    const { game } = this;
    for (let i = 0; i < n; i++) {
      if (until?.()) return i;
      this.t += FRAME_MS;
      game.loop.now = game.loop.time = this.t;
      game.headlessStep(this.t, FRAME_MS);
      // cameras follow (and shake) in preRender, which headlessStep skips
      for (const s of game.scene.getScenes(true)) s.cameras.main.preRender();
    }
    return until?.() ? n - 1 : n; // true after the last step still counts as reached in time
  }

  start(index: number): FlowScene {
    const scenes = this.game.scene;
    this.frames(1);                                      // let queued scene operations (a pause, a resume) settle first
    restartAt(this.game, index);
    const scene = scenes.getScene<FlowScene>(sceneOf(FLOW[index]));
    this.frames(120, () => scene.sys.isActive() && scene.step === index);
    this.frames(15);
    return scene;
  }

  startLevel(id: LevelId): Level {
    const level = this.start(stepOf(id)) as Level;
    level.god = false;
    return level;
  }

  /** Headless steps don't draw. */
  draw(): void {
    this.game.step(this.t, 0);
  }

  /** `index`: the story step to go on at (-1: the title) */
  release(index: number): void {
    Date.now = this.realDateNow;
    setSoundMuted(this.wasMuted, false);
    restartAt(this.game, index);
    saveStepId(this.wasAt);
    saveBeaten(this.wasBeaten);
    this.game.loop.resetDelta();
    if (this.wasRunning) this.game.loop.wake();
  }
}

let held: { stepper: Stepper; step: number } | null = null;

function heldStepper(game: Phaser.Game, step: number): Stepper {
  if (!held) held = { stepper: new Stepper(game), step };
  held.step = step;
  return held.stepper;
}

export async function holdCutscene(game: Phaser.Game, id: CutsceneId, stop: (beat: Beat) => boolean, extra = 0): Promise<string> {
  const step = stepOf(id);
  if (step < 0) return `no cutscene "${id}" in FLOW`;
  const s = heldStepper(game, step);
  const cs = s.start(step) as Cutscene;
  const beats = cs.script.beats;
  const settle = async () => { for (let k = 0; k < 12; k++) await null; };   // the script's promises run on
  let seen = -1, found = -1;
  for (let i = 0; i < 60 * 300; i++) {
    if (!cs.sys.isActive()) return 'the cutscene ended first';
    for (; seen < cs.beatIndex && found < 0; seen++) if (stop(beats[seen + 1])) found = seen + 1;   // beats that started, even instant ones
    if (found >= 0 && !cs.typing) {
      s.frames(extra);
      s.draw();
      return JSON.stringify(beats[found]);
    }
    cs.tap();
    s.frames(1);
    await settle();
  }
  return 'timed out';
}

export function holdLevel(game: Phaser.Game, id: LevelId, stop: (level: Level) => boolean, maxSecs = 60): string {
  const s = heldStepper(game, stepOf(id));
  const level = s.startLevel(id);
  level.controls.driver = autopilot(level);
  const n = s.frames(maxSecs * 60, () => stop(level));
  s.draw();
  return `${EN[level.def.name]} after ${(n / 60).toFixed(1)} s: ${level.phase}, ${progress(level)}`;
}

export const progress = (level: Level) => (level.def.goal ? `${level.collected}/${level.def.goal.count}` : `${level.dev.bosses()}/${level.def.bosses?.length ?? 0} bosses`);

export function release(): void {
  held?.stepper.release(held.step);
  held = null;
}

function stepped<T>(game: Phaser.Game, resumeAt: number, fn: (s: Stepper) => T): T {
  if (held) release();                                 // one stepper at a time (each one swaps Date.now)
  const s = new Stepper(game);
  try { return fn(s); } finally { s.release(resumeAt); }
}

const isAny = (e: Enemy, ...kinds: (abstract new (...args: never[]) => Enemy)[]): boolean => kinds.some(k => e instanceof k);

export function autopilot(level: Level): NonNullable<Controls['driver']> {
  let holdJumpUntil = 0, airJumpAt = Infinity, airJumpHold = 0;
  return (press, hold) => {
    const p = level.player, b = p.body, now = level.clock;
    if (p.dead || level.over) return;
    if (level.phase === 'ready') { press('jump'); return; }
    const front = b.right, feet = b.bottom, onGround = b.blocked.down && b.velocity.y >= 0;   // as the bird sees it (Player.step)
    const enemies = level.dev.enemies().filter(e => e.alive && !(e instanceof Feather && e.harmless));
    const { ground, hazards } = level.dev.layout();
    const overSlide = (e: Enemy) => !(e instanceof Lime && e.charging) && !isAny(e, Archid, Fae, Spark, Feather)
      && e.box.y + e.box.h < feet - BIRD_BOX.slideH && e.box.y + e.box.h > feet - BIRD_BOX.h;
    const jump = (ms: number) => { press('jump'); holdJumpUntil = now + ms; };

    if (onGround && p.dashCooldown(now) > 0 && enemies.some(e => e instanceof Lime && e.charging && e.box.x - front > 30 && e.box.x - front < 60)) { jump(400); airJumpAt = now + 260; airJumpHold = 400; }
    if (enemies.some(e => e instanceof Slash && e.lane === 'big' && e.box.x - front < 30 && e.box.x + e.box.w > b.x)) press(level.controls.rainbowCharged.has('attack') ? 'attack' : 'dash');
    if (enemies.some(e => e instanceof Lime && e.openToRainbow) && level.controls.rainbowCharged.has('attack')) press('attack');
    if (enemies.some(e => (e instanceof Wall || e instanceof Fae || e instanceof Spark || (e instanceof Lime && e.charging)) && e.x - front > 0 && e.x - front < 40)) press('dash');
    if (enemies.some(e => !overSlide(e) && !isAny(e, Wall, Needle, Fae, Shockwave, Slash, Lime) && e.x - front > -10 && e.x - front < 34
      && e.box.y + e.box.h > feet - 36 && e.box.y < feet - 4)) press('attack');
    if (onGround && enemies.some(e => e instanceof Slash && e.lane === 'low' && e.box.x - front > 18 && e.box.x - front < 40)) jump(60);
    if (onGround && enemies.some(e => e instanceof Needle && e.x - front > 60 && e.x - front < 110)) jump(300);
    const waves = enemies.filter(e => e instanceof Shockwave && e.dir < 0 && e.box.x + e.box.w > b.x);
    if (onGround && waves.some(e => e.box.x - front > 4 && e.box.x - front < 30)) {
      jump(270);
      if (waves.length > 1) { airJumpAt = now + 330; airJumpHold = 600; }
    }
    // wide pits get a second jump, not the dash (it stays free for the walls); under a low overhang no jump gets over: dashed
    for (let i = 0; i + 1 < ground.length; i++) {
      const edge = ground[i].x1, far = ground[i + 1].x0, width = far - edge;
      if (width <= 1) continue;
      if (hazards.some(h => h.x < far && h.x + h.w > edge)) { if (edge - front > -2 && edge - front < 6 && onGround) press('dash'); continue; }
      if (edge - front > 6 && edge - front < 20 && onGround) {
        jump(270);
        if (width > 80) { airJumpAt = now + 300; airJumpHold = 1500; }
      }
    }
    if (onGround && now >= holdJumpUntil) {
      for (const [img, kind] of level.dev.pickups()) {
        const dx = img.x - p.x, rise = feet - img.y;
        if (img.body || kind !== level.def.goal?.item || dx < 40 || dx > 60 || rise < 26) continue;
        jump(rise > 50 ? 400 : 40 + rise * 3);
        if (rise > 62) { airJumpAt = now + 320; airJumpHold = 300; }
        break;
      }
    }
    if (now >= airJumpAt) { jump(airJumpHold); airJumpAt = Infinity; }
    if (now < holdJumpUntil) hold('jump');
    if (enemies.some(e => overSlide(e) && e.x - p.x < 70 && e.x - p.x > -30)
      || hazards.some(h => h.x - front < 30 && h.x + h.w > b.x - 4 && h.y + h.h > feet - BIRD_BOX.h)) hold('slide');
  };
}

function playLevel(s: Stepper, id: LevelId, maxSecs: number): LevelRun {
  const level = s.startLevel(id);
  const lost: string[] = [];
  let had = level.lives;
  level.events.on(LevelEvent.Lives, ({ lives }: LivesEvent) => {
    const down = lives < had;
    had = lives;
    if (!down) return;
    const p = level.player, box = p.box;
    const hit = level.dev.enemies().find(e => e.alive && overlaps(e.box, box));
    lost.push(p.dead ? 'pit' : hit ? hit.constructor.name.toLowerCase() : level.dev.layout().hazards.some(h => overlaps(h, box)) ? 'branch' : '?');
  });
  level.controls.driver = autopilot(level);
  s.frames(maxSecs * 60, () => level.over);
  const { lives, name } = level.def;
  const ok = level.phase === 'cleared';
  const how = ok ? `cleared in ${level.elapsed.toFixed(0)} s` : level.phase === 'failed' ? `failed after ${level.elapsed.toFixed(0)} s` : `not done after ${maxSecs} s`;
  const hearts = lives ? `, hearts lost ${lost.length}${lost.length ? ` (${lost.join(', ')})` : ''}` : '';
  return { id, ok, line: `${id} ${EN[name]}: ${how}, ${progress(level)}${hearts}` };
}

const LEVEL_SECS = 180, BOSS_SECS = 300;

export function playLevels(game: Phaser.Game, resumeAt: number, ids = Object.keys(LEVELS) as LevelId[]): LevelRun[] {
  return stepped(game, resumeAt, s => ids.map(id => {
    const secs = LEVELS[id].bosses ? BOSS_SECS : LEVEL_SECS;
    try { return playLevel(s, id, secs); } catch (e) { return { id, ok: false, line: `${id}: ${String(e)}` }; }
  }));
}

export function runChecks(game: Phaser.Game, resumeAt: number): Check[] {
  return stepped(game, resumeAt, s => {
    const checks: Check[] = [];
    const check = (name: string, fn: () => [boolean, string]) => {
      const wasBeaten = savedBeaten();
      try { const [ok, detail] = fn(); checks.push({ name, ok, detail }); } catch (e) { checks.push({ name, ok: false, detail: String(e) }); } finally { saveBeaten(wasBeaten); }
    };
    const keyDown = (scene: Phaser.Scene, name: KeyName) => scene.input.keyboard!.emit(`keydown-${name}`, new KeyboardEvent('keydown'));
    const tap = (level: Level, id: 'jump' | 'dash' = 'jump') => {
      let done = false;
      level.controls.driver = press => { if (!done) { press(id); done = true; } };
      s.frames(1);
      level.controls.driver = undefined;
    };

    check('the first press starts the run, without a jump', () => {
      const l = s.startLevel('l2');
      tap(l);
      s.frames(10);
      return [l.phase === 'running' && l.player.body.blocked.down, `${l.phase}, on the ground: ${l.player.body.blocked.down}`];
    });
    check('pause only while running, resume goes on', () => {
      const l = s.startLevel('l2');
      l.pauseRun(); s.frames(1);
      const ready = l.scene.isPaused();
      tap(l); l.pauseRun(); s.frames(1);
      const running = l.scene.isPaused();
      l.resumeRun(); s.frames(12);
      return [!ready && running && !l.scene.isPaused() && l.phase === 'running', `paused when ready: ${ready}, when running: ${running}, after resume: ${l.scene.isPaused()}`];
    });
    check('a hit blinks: no second hit right after', () => {
      const l = s.startLevel('l2');
      tap(l); l.hurt(); l.hurt(); s.frames(30); l.hurt();
      return [l.lives === 2, `hearts ${l.lives}/3 after three hits within half a second`];
    });
    check('the dash can\'t be hurt', () => {
      const l = s.startLevel('l5');
      tap(l); s.frames(20); tap(l, 'dash'); l.hurt();
      return [l.lives === 3 && l.player.dashing(l.clock), `hearts ${l.lives}/3, dashing: ${l.player.dashing(l.clock)}`];
    });
    check('out of hearts: failed, a press restarts (not too soon)', () => {
      const l = s.startLevel('l2');
      tap(l); l.lives = 1; l.hurt();
      const failed = l.phase;
      tap(l);
      const soon = l.phase;
      s.frames(60); tap(l); s.frames(5);
      return [failed === 'failed' && soon === 'failed' && l.phase === 'ready' && l.lives === 3 && l.elapsed === 0,
        `${failed}, press at once: ${soon}, press later: ${l.phase} with ${l.lives} hearts`];
    });
    check('a fall costs a heart; back on solid ground past the pit, waiting', () => {
      const l = s.startLevel('l3');
      l.god = true;
      tap(l);
      let fellAt = -1;
      s.frames(60 * 60, () => {
        if (l.player.dead && fellAt < 0) { fellAt = l.player.x; l.god = false; }
        return fellAt >= 0 && l.phase === 'ready';
      });
      const { ground } = l.dev.layout();
      const safe = ground.some(g => l.player.x > g.x0 && l.player.x < g.x1) && l.player.x > fellAt;
      return [fellAt >= 0 && l.phase === 'ready' && safe && l.lives === 2,
        fellAt < 0 ? 'never fell in a minute' : `fell at x ${Math.round(fellAt)}, back at ${Math.round(l.player.x)}: ${l.phase}, hearts ${l.lives}/3`];
    });
    check('cleared: runs on, a press continues the story', () => {
      const l = s.startLevel('l2');
      tap(l); l.dev.clear(); s.frames(10);
      const running = l.birdRuns;
      s.frames(60); tap(l); s.frames(60);
      const c = game.scene.getScene(SCENES.Cutscene) as Cutscene;
      return [running && c.sys.isActive() && c.step === l.step + 1, `running after the clear: ${running}, then: ${c.sys.isActive() ? `cutscene step ${c.step}` : 'no cutscene'}`];
    });
    check('the whole story: title -> every step -> title', () => {
      const seen: number[] = [];
      let scene = s.start(0);
      for (let guard = 0; guard < FLOW.length + 2; guard++) {
        const step = scene.step;
        seen.push(step);
        if (FLOW[step].kind !== 'level') keyDown(scene, 'ESC');
        else { const l = scene as Level; tap(l); l.dev.clear(); s.frames(60); tap(l); }
        const next = step + 1 < FLOW.length ? sceneOf(FLOW[step + 1]) : SCENES.Title;
        const target = game.scene.getScene<FlowScene>(next);
        s.frames(60 * 5, () => target.sys.isActive() && (next === SCENES.Title || target.step === step + 1));
        if (next === SCENES.Title) break;
        scene = target;
        s.frames(30);
      }
      const all = seen.length === FLOW.length && seen.every((v, i) => v === i);
      const title = game.scene.isActive(SCENES.Title);
      return [all && title, `steps ${seen.join(' ')} of 0-${FLOW.length - 1}, then ${title ? 'the title' : 'no title'}`];
    });
    check('the title: a press asks for the language, which starts the story; the credits, once played through, go back', () => {
      saveStepId(undefined);
      s.frames(1);
      restartAt(game, -1);
      const title = game.scene.getScene(SCENES.Title), lang = game.scene.getScene(SCENES.Language), credits = game.scene.getScene(SCENES.Credits);
      s.frames(30, () => title.sys.isActive());
      keyDown(title, 'ENTER');
      const asked = s.frames(60, () => lang.sys.isActive()) < 60;
      s.frames(15);
      keyDown(lang, 'ENTER');
      const intro = game.scene.getScene(SCENES.Cutscene) as Cutscene;
      const started = s.frames(60, () => intro.sys.isActive() && intro.step === 0) < 60;
      const creditsOn = (beaten: boolean) => {
        saveBeaten(beaten);
        restartAt(game, -1);
        s.frames(30, () => title.sys.isActive());
        keyDown(title, 'C');
        return s.frames(60, () => credits.sys.isActive()) < 60;
      };
      const hidden = !creditsOn(false);
      const rolled = creditsOn(true);
      s.frames(30);
      keyDown(credits, 'ESC');
      const back = s.frames(60, () => title.sys.isActive() && !credits.sys.isActive()) < 60;
      return [asked && started && hidden && rolled && back,
        `language asked: ${asked}, story started (${language()}): ${started}, credits hidden before: ${hidden}, then: ${rolled}, back to the title: ${back}`];
    });
    check('a reload: the title goes on where the story was; a new game forgets it, and so does its end', () => {
      const title = game.scene.getScene(SCENES.Title), lang = game.scene.getScene(SCENES.Language);
      const toTitle = () => { s.frames(1); restartAt(game, -1); s.frames(30, () => title.sys.isActive()); s.frames(15); };
      const at = stepOf('l2');
      s.start(at);
      const kept = continueAt();
      toTitle();
      keyDown(title, 'ENTER');
      const level = game.scene.getScene(SCENES.Level) as Level;
      const on = s.frames(60, () => level.sys.isActive() && level.step === at) < 60 && !lang.sys.isActive();
      toTitle();
      keyDown(title, 'N');
      const asked = s.frames(60, () => lang.sys.isActive()) < 60;
      s.frames(15);
      const still = continueAt();
      keyDown(lang, 'ENTER');
      const intro = game.scene.getScene(SCENES.Cutscene) as Cutscene;
      s.frames(60, () => intro.sys.isActive() && intro.step === 0);
      const anew = continueAt();
      s.start(at);
      s.start(FLOW.length - 1);
      const ended = continueAt();
      return [kept === at && on && asked && still === at && anew < 0 && ended < 0,
        `kept: step ${kept} (of ${at}), the title goes on there: ${on}; new game asks the language: ${asked} (still kept: ${still === at}), forgotten once it starts: ${anew < 0}, and at the credits: ${ended < 0}`];
    });
    check('20 restarts: no listeners, textures or sounds pile up', () => {
      const l = s.startLevel('l3');
      const count = () => {
        const hud = game.scene.getScene(SCENES.HUD);
        const listeners = (e: Phaser.Events.EventEmitter) => e.eventNames().reduce((n, k) => n + e.listenerCount(k), 0);
        return {
          game: listeners(game.events), level: listeners(l.events), keys: listeners(l.input.keyboard!) + listeners(hud.input.keyboard!),
          input: listeners(l.input) + listeners(hud.input), textures: game.textures.getTextureKeys().length, sounds: game.sound.getAllPlaying().length,
        };
      };
      const restart = () => { l.restartStage(); s.frames(20); tap(l); s.frames(10); };
      restart();
      const first = count();
      for (let i = 0; i < 19; i++) restart();
      const last = count();
      const grew = (Object.keys(first) as (keyof typeof first)[]).filter(k => last[k] > first[k]);
      return [grew.length === 0, grew.length ? grew.map(k => `${k} ${first[k]} -> ${last[k]}`).join(', ') : Object.entries(last).map(([k, v]) => `${k} ${v}`).join(', ')];
    });
    return checks;
  });
}
