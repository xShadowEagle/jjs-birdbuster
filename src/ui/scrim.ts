import type Phaser from 'phaser';
import { GAME_W } from '../constants';
import { UI } from './colors';

const ALPHA = 0.42;

export function scrim(scene: Phaser.Scene, top = 36, bottom = 164): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(-5), mid = (top + bottom) / 2, half = (bottom - top) / 2;
  for (let y = top; y < bottom; y += 2) {
    const k = 1 - Math.abs(y - mid) / half;
    g.fillStyle(UI.panel, ALPHA * Math.min(1, k * 1.8)).fillRect(0, y, GAME_W, 2);
  }
  return g;
}
