import Phaser from 'phaser';
import { GAME_W, GAME_H, GROUND_Y, frameDt } from '../constants';
import Backdrop from '../world/Backdrop';
import { THREAD } from '../entities/enemies/Archid';
import { veil } from '../world/veil';
import { SpeechBubble, type Anchor } from '../ui/SpeechBubble';
import { Button } from '../ui/Button';
import { label, snapToPixels, type Label } from '../ui/text';
import { FONT_H, wrapText } from '../ui/font';
import { UI } from '../ui/colors';
import { fadeIn, leave } from './fade';
import { sfx } from '../audio/sfx';
import { expectMusic, playMusic } from '../audio/music';
import { musicAt } from '../story/music';
import { CHARACTERS } from '../story/characters';
import { CUTSCENES, type CutsceneId } from '../story/cutscenes';
import { HEADS, type Beat, type CutsceneDef, type Emote } from '../story/cutscene';
import type { CharacterId } from '../story/characters';
import type { TextureKey } from '../assets/manifest';
import { playStep, type StepData } from '../story/flow';
import { t } from '../language';
import { freezeWhileBlocked } from '../orientation';
import { tex } from '../assets/keys';
import { BIOMES, type BiomeId } from '../world/biomes';
import { SCENES } from './keys';
import { keepAwake } from '../wake';
import { groundStrip } from '../world/ground';
import { onPress, onTapAway } from '../controls';

type Piece = Phaser.GameObjects.Graphics | Label;

export default class Cutscene extends Phaser.Scene {
  script!: CutsceneDef;
  step = 0;
  private readonly actors = new Map<string, Phaser.GameObjects.Sprite>();
  private readonly rollDy = new Map<Phaser.GameObjects.Sprite, number>();
  private threads: [Phaser.GameObjects.Sprite, Phaser.GameObjects.Rectangle][] = [];
  private bubble!: SpeechBubble;
  private backdrop!: Backdrop;
  private onTap: (() => void) | null = null;
  private ended = false;
  beatIndex = -1;
  /** A restart leaves the old run's loop awaiting a beat: it stops when it sees it's stale. */
  private runs = 0;

  constructor() { super(SCENES.Cutscene); }

  init({ step, id }: StepData & { id: CutsceneId }): void {
    this.script = CUTSCENES[id];
    this.step = step;
    this.actors.clear();
    this.rollDy.clear();
    this.onTap = null;
    this.ended = false;
  }

  create(): void {
    keepAwake(true);
    playMusic(this, musicAt(this.step));
    expectMusic(musicAt(this.step + 1));
    this.buildStage(this.script.stage);
    this.threads = [];
    for (const a of this.script.actors) {
      const s = this.add.sprite(a.x, a.y ?? GROUND_Y, a.texture).setOrigin(0.5, 1)
        .setDepth(a.depth ?? 0).setFlipX(!!a.flip).setVisible(!a.hidden).setScale(a.scale ?? 1);
      if (a.anim) s.play(a.anim);
      if (a.tint !== undefined) s.setTint(a.tint);
      if (a.rolls) { s.setOrigin(0.5, 0.5).setY(s.y - s.height / 2); this.rollDy.set(s, -s.height / 2); }
      this.actors.set(a.id, s);
      if (a.thread) this.threads.push([s, this.add.rectangle(a.x, 0, 1, 0, THREAD).setOrigin(0.5, 0).setDepth(s.depth - 0.1)]);
    }
    this.bubble = new SpeechBubble(this);

    const skip = new Button(this, 0, 12, t('cutscene.skip'), () => this.end()).toRight(6).setDepth(110);
    this.bubble.keepClear(skip.x - Math.floor(skip.boxW / 2) - 2, skip.y + Math.ceil(skip.boxH / 2) + 2);
    onTapAway(this, () => this.tap());
    onPress(this, ['SPACE', 'ENTER'], () => this.tap());
    onPress(this, ['ESC'], () => this.end());

    freezeWhileBlocked(this);

    fadeIn(this);
    void this.run();
  }

  override update(_: number, delta: number): void {
    this.backdrop.update(0, frameDt(delta));
    for (const [sprite, thread] of this.threads) thread.setPosition(sprite.x, 0).setSize(1, Math.max(0, sprite.y - sprite.displayHeight + 3)).setVisible(sprite.visible);
  }

  private buildStage(stage: BiomeId): void {
    const biome = BIOMES[stage];
    this.backdrop = new Backdrop(this, biome);
    groundStrip(this, biome, 0, GAME_W).setDepth(-1);
    veil(this, biome, -0.5);
  }

  private async run(): Promise<void> {
    const run = ++this.runs;
    this.beatIndex = -1;
    for (const [i, beat] of this.script.beats.entries()) {
      if (this.ended || run !== this.runs) return;
      this.beatIndex = i;
      await this.play(beat);
    }
    if (run === this.runs) this.end();
  }

  get typing(): boolean { return this.bubble.typing; }

  tap(): void {
    if (this.bubble.typing) { this.bubble.complete(); return; }
    const next = this.onTap;
    this.onTap = null;
    next?.();
  }

  private async play(b: Beat): Promise<void> {
    if ('say' in b) {
      const heads = [...this.actors].filter(([, s]) => s.visible && s.depth >= 0).map(([id]) => this.anchor(id));
      await this.bubble.say(CHARACTERS[b.say], t(b.text), this.anchor(b.at ?? b.say, b.say), heads);
      await this.nextTap();
      this.bubble.hide();
    } else if ('move' in b) {
      const s = this.actor(b.move);
      if (b.anim) s.play(b.anim, true);
      const moving = new Promise<void>(resolve => this.tweens.add({
        targets: s, x: b.x ?? s.x, y: b.y === undefined ? s.y : b.y + (this.rollDy.get(s) ?? 0), angle: b.angle ?? s.angle, duration: b.ms, ease: b.ease ?? 'Linear', onUpdate: snapToPixels,
        onComplete: () => { if (b.then) s.play(b.then, true); resolve(); },
      }));
      if (!b.async) await moving;
    } else if ('emote' in b) {
      this.emote(this.anchor(b.emote, b.who), b.icon);
    } else if ('wait' in b) {
      await this.wait(b.wait);
    } else if ('play' in b) {
      this.actor(b.play).play(b.anim, true);
    } else if ('show' in b) {
      this.actor(b.show).setVisible(true);
    } else if ('hide' in b) {
      this.actor(b.hide).setVisible(false);
    } else if ('face' in b) {
      this.actor(b.face).setFlipX(b.left);
    } else if ('shake' in b) {
      this.cameras.main.shake(b.shake, 0.008);
    } else if ('sound' in b) {
      sfx[b.sound]();
    } else if ('caption' in b) {
      await this.caption(t(b.caption, b.vars), b.sub === undefined ? undefined : t(b.sub), b.ms ?? 1600);
    } else if ('confetti' in b) {
      this.confetti(b.confetti);
    } else if ('card' in b) {
      await this.card(t(b.card.title), b.card.lines.map(l => t(l)), b.card.from === undefined ? undefined : t(b.card.from));
    }
  }

  private actor(id: string): Phaser.GameObjects.Sprite {
    const s = this.actors.get(id);
    if (!s) throw new Error(`Cutscene has no actor "${id}"`);
    return s;
  }

  private anchor(id: string, who?: CharacterId): Anchor {
    const s = this.actor(id);
    const heads = HEADS[s.texture.key as TextureKey];
    const head = heads && ((who && heads[who]) ?? Object.values(heads)[0]);
    if (!head) return { x: s.x, top: s.y - s.displayHeight, bottom: s.y };
    return { x: Math.round(s.x + (s.flipX ? -head.x : head.x) * s.scaleX), top: Math.round(s.y - head.top * s.scaleY), bottom: s.y };
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  private nextTap(): Promise<void> {
    return new Promise(resolve => { this.onTap = resolve; });
  }

  private appear(items: Piece[], ms: number): void {
    for (const o of items) o.setAlpha(0);
    this.tweens.add({ targets: items, alpha: 1, duration: ms });
  }

  private vanish(items: Piece[], ms: number): Promise<void> {
    this.tweens.add({ targets: items, alpha: 0, duration: ms, onComplete: () => items.forEach(o => o.destroy()) });
    return this.wait(ms);
  }

  private emote(at: Anchor, icon: Emote): void {
    sfx.pop();
    const e = this.add.image(Math.round(at.x), Math.round(at.top - 2), tex(`emote.${icon}`)).setOrigin(0.5, 1).setDepth(105).setScale(0);
    this.tweens.chain({
      targets: e,
      tweens: [
        { scale: 1, duration: 180, ease: 'Back.out' },
        { alpha: 0, delay: 800, duration: 200, onComplete: () => e.destroy() },
      ],
    });
  }

  private async caption(title: string, sub: string | undefined, ms: number): Promise<void> {
    const items = [label(this, GAME_W / 2, GAME_H / 2 - 20, title, { scale: 3, color: UI.gold, origin: 0.5 }).setDepth(95)];
    if (sub) items.push(label(this, GAME_W / 2, GAME_H / 2 + 6, sub, { scale: 2, origin: 0.5 }).setDepth(95));
    this.appear(items, 250);
    await this.wait(ms);
    await this.vanish(items, 250);
  }

  private confetti(ms: number): void {
    const rain = this.add.particles(0, -4, tex('fx.spark'), {
      x: { min: 0, max: GAME_W }, speedY: { min: 30, max: 80 }, speedX: { min: -25, max: 25 }, gravityY: 20,
      lifespan: 4500, frequency: 40, quantity: 2, rotate: { min: 0, max: 360 }, scale: { min: 0.8, max: 1.4 },
      tint: [0xff5a8a, 0xffd35a, 0x6ad0ff, 0xa6e07a, 0xc08aff, 0xfff8e0],
    }).setDepth(92);
    this.time.delayedCall(ms, () => rain.stop());
    this.time.delayedCall(ms + 4600, () => rain.destroy());
  }

  /** Waits a moment before the tap: one meant for the last line mustn't skip it. */
  private async card(title: string, paragraphs: string[], from?: string): Promise<void> {
    const W = 344, PAD = 12, LINE = FONT_H + 5, GAP = 5, TITLE_H = 22;
    const rows: { text: string; y: number }[] = [];
    let ty = TITLE_H;
    paragraphs.forEach((p, i) => {
      if (i) ty += GAP;
      for (const text of wrapText(p, W - PAD * 2)) { rows.push({ text, y: ty }); ty += LINE; }
    });
    const h = PAD + ty + (from ? LINE : 0) + PAD - 4;
    const x = Math.round((GAME_W - W) / 2);
    const y = Math.max(6, Math.round(Math.min((GAME_H - h) / 2, GROUND_Y - 44 - h)));
    const g = this.add.graphics().setDepth(96);
    g.fillStyle(UI.panel, 0.94).fillRoundedRect(x, y, W, h, 6);
    g.lineStyle(1, UI.gold, 0.9).strokeRoundedRect(x + 0.5, y + 0.5, W - 1, h - 1, 6);
    const items: Piece[] = [
      g,
      label(this, GAME_W / 2, y + PAD, title, { scale: 2, color: UI.gold, origin: [0.5, 0] }).setDepth(97),
      ...rows.map(r => label(this, GAME_W / 2, y + PAD + r.y, r.text, { origin: [0.5, 0] }).setDepth(97)),
    ];
    if (from) items.push(label(this, x + W - PAD, y + h - PAD - FONT_H + 2, from, { origin: [1, 0], color: UI.dim }).setDepth(97));
    this.appear(items, 400);
    await this.wait(900);
    await this.nextTap();
    await this.vanish(items, 300);
  }

  private end(): void {
    if (this.ended) return;
    this.ended = true;
    this.bubble.hide();
    leave(this, () => playStep(this, this.step + 1), { ms: 250 });
  }
}
