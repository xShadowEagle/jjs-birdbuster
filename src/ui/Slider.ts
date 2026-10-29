import Phaser from 'phaser';
import { UI } from './colors';

const STEP = 0.05;

/** For 0 to 1; its left edge at (x, y centre). */
export class Slider extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private dragging = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly len: number, public value: number,
    private readonly onChange: (value: number, done: boolean) => void) {
    super(scene, Math.round(x), Math.round(y));
    this.g = scene.add.graphics();
    this.add(this.g);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-8, -12, len + 16, 24), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true,
    });
    const move = (p: Phaser.Input.Pointer) => { if (this.dragging) this.set(this.fromPointer(p), false); };
    const up = (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.set(this.fromPointer(p), true);
    };
    this.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => { this.dragging = true; this.set(this.fromPointer(p), false); });
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, move);
    // a mouse let go of beside the canvas only sends UP_OUTSIDE
    const ups = [Phaser.Input.Events.POINTER_UP, Phaser.Input.Events.POINTER_UP_OUTSIDE];
    for (const e of ups) scene.input.on(e, up);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, move);
      for (const e of ups) scene.input.off(e, up);
    });
    scene.add.existing(this);
    this.draw();
  }

  set(v: number, done: boolean): void {
    this.value = Phaser.Math.Clamp(Math.round(v / STEP) * STEP, 0, 1);
    this.draw();
    this.onChange(this.value, done);
  }

  private fromPointer(p: Phaser.Input.Pointer): number {
    return (p.x - this.x - (this.parentContainer?.x ?? 0)) / this.len;
  }

  private draw(): void {
    const g = this.g, w = this.len, fill = Math.round(this.value * w);
    g.clear();
    g.fillStyle(UI.panel, 0.9).fillRect(-1, -3, w + 2, 6);
    g.fillStyle(UI.dim, 1).fillRect(0, -2, w, 4);
    g.fillStyle(UI.gold, 1).fillRect(0, -2, fill, 4);
    g.fillStyle(UI.panel, 1).fillRect(fill - 3, -7, 6, 14);
    g.fillStyle(this.dragging ? UI.gold : UI.text, 1).fillRect(fill - 2, -6, 4, 12);
  }
}
