import type Phaser from 'phaser';
import { GROUND_Y } from '../constants';
import type { Biome } from './biomes';

export function groundStrip(scene: Phaser.Scene, biome: Biome, x: number, w: number, key: string = biome.ground): Phaser.GameObjects.TileSprite {
  const h = scene.textures.get(key).getSourceImage().height;
  return scene.add.tileSprite(x, GROUND_Y - (biome.groundOverhang ?? 0), w, h, key).setOrigin(0);
}
