import Phaser from 'phaser';
import { FONT, FONT_H, fontText, textWidth } from './font';
import { UI } from './colors';

interface LabelOpts {
  scale?: number;
  color?: number;
  origin?: number | [number, number];
  keepCase?: boolean;
}

/** Placed and measured by its visible letters (`textW` by `textH`): Phaser's size includes the outline. */
export class Label extends Phaser.GameObjects.BitmapText {
  private ax!: number;
  private ay!: number;
  private ox!: number;
  private oy!: number;
  private px = 1;
  private keepCase = false;
  textW = 0;
  textH = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, { scale = 1, color = UI.text, origin = 0, keepCase = false }: LabelOpts = {}) {
    const px = Math.max(1, Math.round(scale));
    super(scene, 0, 0, FONT, '', FONT_H * px);
    this.px = px;
    this.keepCase = keepCase;
    [this.ox, this.oy] = typeof origin === 'number' ? [origin, origin] : origin;
    this.ax = x; this.ay = y;
    this.setText(text);
    this.setTint(color);
    scene.add.existing(this);
  }

  override setText(value: string): this {
    const text = fontText(value, this.keepCase);
    super.setText(text);
    this.textW = textWidth(text, this.px, this.keepCase);
    this.textH = FONT_H * this.px;
    this.place();
    return this;
  }

  moveTo(x: number, y: number): this {
    this.ax = x; this.ay = y;
    this.place();
    return this;
  }

  get left(): number { return this.x; }

  private place(): void {
    if (this.ax === undefined) return; // setText runs once inside the super constructor
    this.x = Math.round(this.ax - this.textW * this.ox);
    this.y = Math.round(this.ay - this.textH * this.oy);
  }
}

export const label = (scene: Phaser.Scene, x: number, y: number, text: string, opts?: LabelOpts) => new Label(scene, x, y, text, opts);

export function snapToPixels(_: Phaser.Tweens.Tween, target: { x: number; y: number }): void {
  target.x = Math.round(target.x);
  target.y = Math.round(target.y);
}
