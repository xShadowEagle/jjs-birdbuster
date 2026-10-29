import Phaser from 'phaser';
import { BUBBLE, GAME_W, GAME_H, GROUND_Y } from '../constants';
import { FONT_H, LINE_H, parseStrikes, textWidth, wrapText } from './font';
import { Label, label } from './text';
import { UI } from './colors';
import { sfx } from '../audio/sfx';
import type { Character } from '../story/characters';
import { t } from '../language';

const { w: W, pad: PAD, portrait: PORTRAIT } = BUBBLE;
export const CPS = 45;
const PORTRAIT_BG = 0x2e2440;

export interface Anchor { x: number; top: number; bottom: number }

const EMOTE_ROOM = 17;
const EDGE = 4;
const TAIL = 7;
const TAG_UP = 10;
const MIN_Y = 12, MIN_Y_ABOVE = 16;
const GAP_SKY = 10, GAP_BELOW = 12;
const ON_GROUND = 4, BESIDE = 8;

interface KeepOut { left: number; bottom: number }
interface Placement { x: number; y: number; h: number; above: boolean }

const textH = (lines: number) => (lines - 1) * LINE_H + FONT_H;

function placeBubble(lines: number, at: Anchor, heads: Anchor[], keepOut?: KeepOut): Placement {
  const h = Math.max(PORTRAIT, textH(lines)) + PAD * 2;
  let x = Phaser.Math.Clamp(Math.round(at.x - W / 2), EDGE, GAME_W - W - EDGE);
  const grounded = (o: Anchor) => o.bottom >= GROUND_Y - ON_GROUND;
  const under = heads.filter(o => grounded(o) && o.x > x - BESIDE && o.x < x + W + BESIDE).map(o => o.top);
  const yAbove = grounded(at)
    ? Math.round(Math.min(at.top, ...under) - EMOTE_ROOM - TAIL - h)
    : Math.round(at.top - h - GAP_SKY);
  const above = yAbove >= MIN_Y_ABOVE;
  const yBelow = Math.min(at.bottom + GAP_BELOW, GAME_H - h - EDGE, ...under.map(top => top - EMOTE_ROOM - h));
  const y = above ? yAbove : Math.round(Math.max(at.bottom + 2, yBelow, MIN_Y));
  if (keepOut && y - TAG_UP < keepOut.bottom && x + W > keepOut.left) x = Math.max(EDGE, keepOut.left - W - 2);
  return { x, y, h, above };
}

export class SpeechBubble {
  private readonly root: Phaser.GameObjects.Container;
  private lines: Label[] = [];
  private full: string[] = [];
  private struck: boolean[][] = [];
  private strikes?: Phaser.GameObjects.Graphics;
  private joined = '';
  private shown = 0;
  private total = 0;
  private timer?: Phaser.Time.TimerEvent;
  private done?: () => void;
  private keepOut?: KeepOut;

  constructor(private readonly scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0).setDepth(100).setVisible(false);
  }

  keepClear(left: number, bottom: number): this {
    this.keepOut = { left, bottom };
    return this;
  }

  get typing(): boolean { return this.shown < this.total; }

  say(who: Character, text: string, at: Anchor, heads: Anchor[] = []): Promise<void> {
    this.clear();
    const { plain, struck } = parseStrikes(text);
    this.full = wrapText(plain, BUBBLE.textW);
    let p = 0;
    this.struck = this.full.map(line => {
      const flags = struck.slice(p, p + line.length);
      p += line.length + 1; // a line break drops the space it was at
      return flags;
    });
    this.build(who, at, placeBubble(this.full.length, at, heads, this.keepOut));
    return this.typeOut(who.voice);
  }

  private build(who: Character, at: Anchor, { x, y, h, above }: Placement): void {
    const s = this.scene, g = s.add.graphics();
    const tx = Phaser.Math.Clamp(Math.round(at.x), x + 10, x + W - 10);
    const [ty0, ty1] = above ? [y + h - 1, y + h + TAIL] : [y + 1, y - TAIL];
    g.fillStyle(UI.panel, 0.94).fillTriangle(tx - 5, ty0, tx + 5, ty0, tx, ty1);
    g.lineStyle(1, UI.text, 0.7).lineBetween(tx - 5, ty0, tx, ty1).lineBetween(tx + 5, ty0, tx, ty1);
    g.fillStyle(UI.panel, 0.94).fillRoundedRect(x, y, W, h, 4);
    g.lineStyle(1, UI.text, 0.7).strokeRoundedRect(x + 0.5, y + 0.5, W - 1, h - 1, 4);
    g.fillStyle(UI.panel, 0.94).fillRect(tx - 4, above ? y + h - 2 : y, 9, 3);
    g.fillStyle(PORTRAIT_BG, 1).fillRect(x + PAD - 1, y + PAD - 1, PORTRAIT + 2, PORTRAIT + 2);
    const name = t(who.name), nameW = textWidth(name) + 8, tagY = y - TAG_UP;
    g.fillStyle(UI.panel, 0.94).fillRoundedRect(x + 4, tagY, nameW, 12, 3);
    g.lineStyle(1, who.color, 1).strokeRoundedRect(x + 4.5, tagY + 0.5, nameW - 1, 11, 3);

    this.root.add([
      g,
      s.add.image(x + PAD, y + PAD, who.portrait).setOrigin(0),
      label(s, x + 8, tagY + 3, name, { color: who.color }),
    ]);
    const top = y + PAD + Math.round((PORTRAIT - textH(BUBBLE.maxLines)) / 2);
    this.lines = this.full.map((_, i) => label(s, x + PAD * 2 + PORTRAIT, top + i * LINE_H, ''));
    this.root.add(this.lines);
    this.strikes = s.add.graphics();
    this.root.add(this.strikes);
    this.root.setVisible(true);
  }

  private typeOut(voice: number): Promise<void> {
    this.joined = this.full.join('');
    this.total = this.joined.length;
    this.shown = 0;
    return new Promise(resolve => {
      this.done = resolve;
      this.timer = this.scene.time.addEvent({
        delay: 1000 / CPS, loop: true,
        callback: () => {
          this.shown++;
          const ch = this.joined[this.shown - 1];
          if (ch && ch !== ' ' && this.shown % 2 === 1) sfx.voice(voice);
          this.render();
        },
      });
    });
  }

  complete(): void {
    this.shown = this.total;
    this.render();
  }

  hide(): void {
    this.clear();
    this.root.setVisible(false);
  }

  private render(): void {
    let left = this.shown;
    this.strikes?.clear();
    this.full.forEach((line, i) => {
      const shown = Math.max(0, Math.min(line.length, left));
      this.lines[i].setText(line.slice(0, shown));
      this.strike(i, shown);
      left -= line.length;
    });
    if (this.shown >= this.total) {
      this.timer?.remove();
      this.timer = undefined;
      const done = this.done;
      this.done = undefined;
      done?.();
    }
  }

  private strike(i: number, shown: number): void {
    const g = this.strikes, line = this.full[i], flags = this.struck[i], lab = this.lines[i];
    if (!g || !lab) return;
    const at = (n: number) => (n ? textWidth(line.slice(0, n)) + 2 : 0);
    for (let a = 0; a < shown; a++) {
      if (!flags[a]) continue;
      let b = a;
      while (b + 1 < shown && flags[b + 1]) b++;
      const x0 = lab.x + at(a), x1 = lab.x + textWidth(line.slice(0, b + 1));
      g.fillStyle(UI.text, 1).fillRect(x0 - 1, lab.y + 3, x1 - x0 + 2, 1);
      a = b;
    }
  }

  private clear(): void {
    this.timer?.remove();
    this.timer = undefined;
    this.root.removeAll(true);
    this.lines = [];
    this.strikes = undefined;
    this.shown = this.total = 0;
  }
}
