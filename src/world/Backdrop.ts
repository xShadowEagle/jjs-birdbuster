import type Phaser from 'phaser';
import { DEPTH, GAME_W, GAME_H } from '../constants';
import type { ImageKey } from '../assets/manifest';
import type { Biome, ParallaxLayer } from './biomes';

export const MENU_PAN = 16;

export default class Backdrop {
  private readonly sky: Phaser.GameObjects.Rectangle;
  private readonly layers: { s: Phaser.GameObjects.TileSprite; l: ParallaxLayer }[];
  private t = 0;
  private panned = 0;

  constructor(scene: Phaser.Scene, biome: Pick<Biome, 'sky' | 'layers'>, texture: (key: ImageKey) => string = key => key) {
    this.sky = scene.add.rectangle(0, 0, GAME_W, GAME_H, biome.sky).setOrigin(0).setScrollFactor(0);
    this.layers = biome.layers.map(l => {
      const key = texture(l.key), h = scene.textures.get(key).getSourceImage().height;
      const s = scene.add.tileSprite(0, GAME_H - h, GAME_W, h, key).setOrigin(0).setScrollFactor(0);
      return { s, l };
    });
    this.setDepth(DEPTH.backdrop);
  }

  update(scrollX: number, dt: number): void {
    this.t += dt;
    for (const { s, l } of this.layers) s.tilePositionX = Math.round(scrollX * l.factor + (l.drift ?? 0) * this.t);
  }

  pan(dt: number, speed = MENU_PAN): void {
    this.panned += speed * dt;
    this.update(this.panned, dt);
  }

  setDepth(base: number): this {
    this.sky.setDepth(base);
    this.layers.forEach(({ s }, i) => s.setDepth(base + 0.1 + i * 0.01));
    return this;
  }

  setAlpha(a: number): this {
    this.sky.setAlpha(a);
    for (const { s } of this.layers) s.setAlpha(a);
    return this;
  }

  get alpha(): number { return this.sky.alpha; }
  set alpha(a: number) { this.setAlpha(a); }
}
