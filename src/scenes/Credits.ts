import Phaser from 'phaser';
import { GAME_W, GAME_H, frameDt } from '../constants';
import { label } from '../ui/text';
import { FONT_H, LINE_H, wrapText } from '../ui/font';
import { UI } from '../ui/colors';
import { fadeIn, leave } from './fade';
import { playMusic } from '../audio/music';
import { musicAt } from '../story/music';
import { playStep, type StepData } from '../story/flow';
import { SCENES } from './keys';
import Backdrop, { MENU_PAN } from '../world/Backdrop';
import { BIOMES } from '../world/biomes';
import { CAST, CREDITS } from '../credits';
import { t } from '../language';
import { saveBeaten } from '../save';
import { keepAwake } from '../wake';
import { onPress } from '../controls';
import { freezeWhileBlocked } from '../orientation';

const ROLL_SPEED = 20;
const HOLD_MS = 2500;
const WRAP_W = 240;
const QUIET_MS = 400;     // else the press that opened it ends it
const CAST_TEXT_X = GAME_W / 2 - 26, TEXT_GAP = 8, SPRITE_GAP = 3, ROW_GAP = 8;

export default class Credits extends Phaser.Scene {
  step = -1;
  private backdrop!: Backdrop;
  private roll!: Phaser.GameObjects.Container;
  private rollH = 0;
  private rollY = 0;

  constructor() { super(SCENES.Credits); }

  init({ step }: StepData): void {
    this.step = step;
  }

  create(): void {
    keepAwake(true);
    if (this.step >= 0) saveBeaten(true);
    this.backdrop = new Backdrop(this, BIOMES.meadow).setDepth(-20);
    this.add.rectangle(0, 0, GAME_W, GAME_H, UI.panel, 0.6).setOrigin(0).setDepth(-5);
    playMusic(this, musicAt(this.step));

    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    const line = (text: string, opts: Parameters<typeof label>[4] = {}) => {
      parts.push(label(this, GAME_W / 2, y, text, { origin: [0.5, 0], ...opts }));
      y += LINE_H * (opts.scale ?? 1);
    };
    line(t('credits.title'), { scale: 2, color: UI.gold });
    y += LINE_H * 2;
    line(t('credits.cast'), { color: UI.gold });
    for (const m of CAST) {
      y += ROW_GAP;
      const sprites = m.sprites.map(s => { const sp = this.add.sprite(0, 0, s.texture).setOrigin(0.5, 1); if (s.anim) sp.play(s.anim); return sp; });
      const drawn = sprites.map(sp => this.drawn(sp));
      const tallest = Math.max(...sprites.map((sp, i) => sp.height - drawn[i].top));
      const emptyUnder = Math.min(...sprites.map((sp, i) => sp.height - drawn[i].bottom));
      let right = CAST_TEXT_X - TEXT_GAP;
      for (let i = sprites.length - 1; i >= 0; i--) {
        const sp = sprites[i], x = Math.round(right + sp.width / 2 - drawn[i].right);
        sp.setPosition(x, y + tallest);
        right = x - sp.width / 2 + drawn[i].left - SPRITE_GAP;
      }
      const h = tallest - emptyUnder, ty = y + Math.round((h - LINE_H - FONT_H) / 2);
      parts.push(...sprites, label(this, CAST_TEXT_X, ty, t(m.name)), label(this, CAST_TEXT_X, ty + LINE_H, t(m.role), { color: UI.dim }));
      y += h;
    }
    for (const s of CREDITS) {
      y += LINE_H * 2;
      line(t(s.heading), { color: UI.gold });
      for (const l of s.lines) for (const row of wrapText(t(l), WRAP_W)) line(row);
    }
    y += LINE_H * 3;
    line(t('credits.end'), { scale: 2 });
    this.rollH = y;
    this.roll = this.add.container(0, 0, parts);
    this.rollY = GAME_H;
    this.roll.setY(this.rollY);

    // not a time.now kept from create(): it's stale until the first update
    const press = () => { if (this.time.now - this.time.startTime >= QUIET_MS) this.end(); };
    this.input.on(Phaser.Input.Events.POINTER_UP, press);
    onPress(this, ['SPACE', 'ENTER', 'ESC'], press);
    freezeWhileBlocked(this);
    fadeIn(this);
  }

  override update(_: number, delta: number): void {
    const dt = frameDt(delta);
    this.backdrop.pan(dt, MENU_PAN / 2);
    const stop = GAME_H / 2 - this.rollH + LINE_H;
    if (this.rollY > stop) {
      this.rollY = Math.max(stop, this.rollY - ROLL_SPEED * dt);
      this.roll.setY(Math.round(this.rollY));
      if (this.rollY === stop) this.time.delayedCall(HOLD_MS, () => this.end());
    }
  }

  private drawn(sp: Phaser.GameObjects.Sprite): { left: number; top: number; right: number; bottom: number } {
    const { cutX, cutY, cutWidth: w, cutHeight: h } = sp.frame;
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.canvas.width = w;
    ctx.canvas.height = h;
    ctx.drawImage(sp.frame.source.image as CanvasImageSource, cutX, cutY, w, h, 0, 0, w, h);
    const alpha = ctx.getImageData(0, 0, w, h).data;
    let left = w, top = h, right = 0, bottom = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!alpha[(y * w + x) * 4 + 3]) continue;
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
    }
    return { left, top, right, bottom };
  }

  private end(): void {
    leave(this, () => (this.step < 0 ? this.scene.start(SCENES.Title) : playStep(this, this.step + 1)), { ms: 300 });
  }
}
