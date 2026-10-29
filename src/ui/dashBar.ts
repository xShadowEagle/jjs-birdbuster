import type Phaser from 'phaser';
import { RAINBOW, UI } from './colors';
import { RING_FRAME_MS } from './touch';
import type { Label } from './text';

const DASH_BAR = { w: 20, h: 3 };

const flow = (now: number) => Math.floor(now / RING_FRAME_MS);

/** `cool` runs from 1 to 0 as the dash cools down. */
export function drawDashBar(g: Phaser.GameObjects.Graphics, x: number, y: number, cool: number, charged: boolean, now: number): void {
  const { w, h } = DASH_BAR;
  g.fillStyle(UI.trough).fillRect(x, y, w, h);
  if (!charged) {
    g.fillStyle(UI.gold).fillRect(x, y, Math.round(w * (1 - cool)), h);
    return;
  }
  const shift = flow(now);
  for (let i = 0; i < w; i++) {
    const at = (((i - shift) % w) + w) % w;
    g.fillStyle(RAINBOW[Math.floor((at * RAINBOW.length) / w)]).fillRect(x + i, y, 1, h);
  }
}

/** The whole word in one colour: Phaser draws per-letter tints all in the last letter's. */
export function tintDashLabel(label: Label, charged: boolean, now: number): void {
  label.setTint(charged ? RAINBOW[Math.floor(flow(now) / 3) % RAINBOW.length] : UI.gold);
}
