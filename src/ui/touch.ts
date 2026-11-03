import type Phaser from 'phaser';
import { HINT_BLINK_MS, TOUCH, type ButtonId, type Swing } from '../constants';
import { tex } from '../assets/keys';
import { UI } from './colors';

/** `cool`: the cooldown left, 0 to 1; `hint`: the gold ring's alpha, 0 for none */
interface ButtonLook { down?: boolean; cool?: number; hint?: number }

export const hintAlpha = (now: number): number => 0.65 + 0.35 * Math.cos((now / HINT_BLINK_MS) * Math.PI);
const HINT_RING = { gap: 3, w: 2 };

export const iconOf = (id: ButtonId, swing?: Swing) => (id === 'attack' && swing === 'cleave' ? tex('ui.icon_cleave') : tex(`ui.icon_${id}` as const));

export const RAINBOW_BUTTONS = ['attack', 'dash'] as const satisfies readonly ButtonId[];
export type RainbowButton = (typeof RAINBOW_BUTTONS)[number];
export const rainbowIconOf = (id: RainbowButton) => tex(id === 'attack' ? 'ui.icon_cleave_rainbow' : 'ui.icon_dash_rainbow');
export const RING_FRAME_MS = 90;

export const iconAlpha = (down: boolean): number => (down ? 1 : 0.8);

export function drawTouchDisc(g: Phaser.GameObjects.Graphics, x: number, y: number, { down = false, cool = 0, hint = 0 }: ButtonLook = {}): void {
  const R = TOUCH.buttonR;
  g.fillStyle(0xffffff, down ? 0.35 : 0.14).fillCircle(x, y, R);
  if (cool > 0) {
    const a0 = -Math.PI / 2;
    g.fillStyle(0x000000, 0.45).slice(x, y, R, a0, a0 + cool * Math.PI * 2, false).fillPath();
  }
  g.lineStyle(1.5, 0xffffff, down ? 0.8 : 0.45).strokeCircle(x, y, R);
  if (hint > 0) g.lineStyle(HINT_RING.w, UI.gold, hint).strokeCircle(x, y, R + HINT_RING.gap);
}
