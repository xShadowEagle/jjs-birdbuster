import Phaser from 'phaser';
import { GAME_W, GAME_H, frameDt } from '../constants';
import { label, type Label } from '../ui/text';
import { UI } from '../ui/colors';
import { Button } from '../ui/Button';
import { scrim } from '../ui/scrim';
import { fadeIn, isLeaving, leave } from './fade';
import { sfx } from '../audio/sfx';
import { expectMusic, playMusic } from '../audio/music';
import { musicAt } from '../story/music';
import { playStep } from '../story/flow';
import { SCENES } from './keys';
import Backdrop from '../world/Backdrop';
import { BIOMES } from '../world/biomes';
import { LANGUAGES, chooseLanguage, inEvery, language } from '../language';
import { onPress } from '../controls';

const BUTTON_PITCH = 30;

export default class Language extends Phaser.Scene {
  private backdrop!: Backdrop;
  private picked = 0;
  private cursor!: Label;
  private cursorX = 0;
  private readonly ys: number[] = [];

  constructor() { super(SCENES.Language); }

  create(): void {
    this.backdrop = new Backdrop(this, BIOMES.meadow).setDepth(-20);
    playMusic(this, 'title');
    expectMusic(musicAt(0));

    const head = label(this, GAME_W / 2, 0, inEvery('language.heading').join(' · '), { scale: 2, color: UI.gold, origin: 0.5 });
    const buttons = LANGUAGES.map((l, i) => {
      const b = new Button(this, GAME_W / 2, 0, l.name, () => this.take(i, false), { scale: 2, minWidth: 124 });
      if (!l.ready) b.setAlpha(0.4).disableInteractive();
      return b;
    });
    const headGap = 18, boxH = buttons[0].boxH;
    const blockH = head.textH + headGap + (buttons.length - 1) * BUTTON_PITCH + boxH;
    const top = Math.round((GAME_H - blockH) / 2);
    head.moveTo(GAME_W / 2, top + head.textH / 2);
    this.ys.length = 0;
    buttons.forEach((b, i) => { const y = top + head.textH + headGap + Math.floor(boxH / 2) + i * BUTTON_PITCH; b.setY(y); this.ys.push(y); });
    scrim(this, top - 22, top + blockH + 22);
    this.picked = Math.max(0, LANGUAGES.findIndex(l => l.id === language()));
    this.cursorX = GAME_W / 2 - Math.ceil(buttons[0].boxW / 2) - 12;
    this.cursor = label(this, this.cursorX, this.ys[this.picked], '>', { scale: 2, color: UI.gold, origin: 0.5 });

    onPress(this, ['UP', 'W'], () => this.move(-1), { repeat: true });
    onPress(this, ['DOWN', 'S'], () => this.move(1), { repeat: true });
    onPress(this, ['SPACE', 'ENTER'], () => this.take(this.picked));
    onPress(this, ['ESC'], () => leave(this, () => this.scene.start(SCENES.Title), { click: true }));
    fadeIn(this);
  }

  override update(_: number, delta: number): void {
    this.backdrop.pan(frameDt(delta));
  }

  private move(by: number): void {
    if (isLeaving(this)) return;
    for (let i = this.picked + by; i >= 0 && i < LANGUAGES.length; i += by) {
      if (!LANGUAGES[i].ready) continue;
      this.picked = i;
      this.cursor.moveTo(this.cursorX, this.ys[i]);
      sfx.click();
      return;
    }
  }

  private take(i: number, click = true): void {
    const l = LANGUAGES[i];
    if (!l.ready) return;
    if (leave(this, () => playStep(this, 0), { click })) chooseLanguage(l.id);
  }
}
