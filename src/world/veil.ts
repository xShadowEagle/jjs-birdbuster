import type Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants';
import type { Biome } from './biomes';

export function veil(scene: Phaser.Scene, biome: Biome, depth: number): Phaser.GameObjects.Rectangle | undefined {
  if (!biome.dark) return undefined;
  return scene.add.rectangle(0, 0, GAME_W, GAME_H, biome.dark.color, biome.dark.alpha).setOrigin(0).setScrollFactor(0).setDepth(depth);
}
