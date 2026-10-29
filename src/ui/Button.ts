import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { Label } from './text';
import { FONT_H } from './font';
import { UI } from './colors';
import { GAME_W, GAME_H } from '../constants';

/** `fn` on a release over `target` only if the press started on it too: a drag let go of over it doesn't count. */
export function onTap(target: Phaser.GameObjects.GameObject, fn: () => void, look?: (down: boolean) => void): void {
  let pressed = false;
  target.on(Phaser.Input.Events.POINTER_DOWN, () => { pressed = true; look?.(true); });
  target.on(Phaser.Input.Events.POINTER_OUT, () => { pressed = false; look?.(false); });
  target.on(Phaser.Input.Events.POINTER_UP, () => {
    look?.(false);
    if (!pressed) return;
    pressed = false;
    fn();
  });
}

/** Being interactive, it stops the tap from reaching scenes below (Phaser's globalTopOnly). */
export class Button extends Phaser.GameObjects.Container {
  private readonly label: Label;
  private readonly bg: Phaser.GameObjects.Graphics;
  private bw = 0;
  private readonly bh: number;
  private readonly minWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, { scale = 1, minWidth = 0 } = {}) {
    super(scene, Math.round(x), Math.round(y));
    this.label = new Label(scene, 0, 0, text, { scale });
    this.bg = scene.add.graphics();
    this.bh = FONT_H * scale + 8;
    this.minWidth = minWidth;
    this.add([this.bg, this.label]);
    this.setText(text);
    this.setInteractive({ useHandCursor: true });
    onTap(this, () => { sfx.click(); onClick(); }, down => this.draw(down));
    scene.add.existing(this);
  }

  /** The box as drawn: `width` and `height` are the padded hit area's. */
  get boxW(): number { return this.bw; }
  get boxH(): number { return this.bh; }

  toBottomRight(margin: number): this {
    return this.toRight(margin).setY(GAME_H - margin - Math.ceil(this.bh / 2));
  }

  toRight(margin: number): this {
    return this.setX(GAME_W - margin - Math.ceil(this.bw / 2));
  }

  setText(text: string): this {
    this.label.setText(text);
    this.bw = Math.max(this.minWidth, this.label.textW + 12);
    if ((this.bw - this.label.textW) % 2) this.bw++;
    this.setSize(this.bw + 12, this.bh + 10);
    (this.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setSize(this.width, this.height);
    this.draw(false);
    return this;
  }

  private draw(pressed: boolean): void {
    const g = this.bg, w = this.bw, h = this.bh;
    const x0 = -Math.floor(w / 2), y0 = -Math.floor(h / 2);
    g.clear();
    g.fillStyle(UI.panel, pressed ? 0.95 : 0.8).fillRoundedRect(x0, y0, w, h, 3);
    g.lineStyle(1, pressed ? UI.gold : UI.text, pressed ? 1 : 0.6).strokeRoundedRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1, 3);
    const l = this.label;
    l.moveTo(x0 + Math.floor((w - l.textW) / 2), y0 + Math.floor((h - l.textH) / 2) + (pressed ? 1 : 0));
  }
}
