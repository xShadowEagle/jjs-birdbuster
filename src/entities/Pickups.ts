import Phaser from 'phaser';
import type { ItemId } from '../items';
import type { ImageKey } from '../assets/manifest';
import { DROP_BEHIND, DEPTH, GAME_H, PICKUP_GRACE } from '../constants';

type Img = Phaser.GameObjects.Image;

export interface Picked { kind: ItemId; image: Img }

export default class Pickups {
  private readonly items = new Map<Img, ItemId>();
  private readonly falling: Phaser.Physics.Arcade.Group;

  constructor(private readonly scene: Phaser.Scene, readonly look: (kind: ItemId) => ImageKey) {
    this.falling = scene.physics.add.group({ bounceY: 0.35, dragX: 200 });
  }

  get all(): ReadonlyMap<Img, ItemId> { return this.items; }

  landOn(...solids: Phaser.Physics.Arcade.StaticGroup[]): void {
    for (const s of solids) this.scene.physics.add.collider(this.falling, s);
  }

  place(kind: ItemId, x: number, y: number): void {
    const s = this.scene;
    const img = s.add.image(x, y, this.look(kind)).setDepth(DEPTH.pickup);
    const phase = (x % 480) / 480;
    s.tweens.add({ targets: img, y: y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: phase * 700 });
    s.tweens.add({ targets: img, angle: { from: -8, to: 8 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: phase * 1100 });
    this.items.set(img, kind);
  }

  drop(kind: ItemId, x: number, y: number, vx: number, vy: number): void {
    const img = this.scene.physics.add.image(x, y, this.look(kind)).setDepth(DEPTH.pickup);
    this.falling.add(img);
    img.setVelocity(vx, vy);
    this.items.set(img, kind);
  }

  dropAhead(kind: ItemId, birdX: number): void {
    this.drop(kind, birdX + 150, 40, 0, 0);
  }

  collect(body: Phaser.Physics.Arcade.Body): Picked[] {
    const got: Picked[] = [];
    for (const [image, kind] of this.items) {
      if (Math.abs(image.x - body.center.x) > body.halfWidth + PICKUP_GRACE.x || Math.abs(image.y - body.center.y) > body.halfHeight + PICKUP_GRACE.y) continue;
      this.forget(image);
      got.push({ kind, image });
    }
    return got;
  }

  update(camLeft: number): void {
    for (const image of this.items.keys()) {
      if (image.x < camLeft - DROP_BEHIND || image.y > GAME_H + 32) { this.forget(image); image.destroy(); }
    }
  }

  private forget(image: Img): void {
    this.items.delete(image);
    this.scene.tweens.killTweensOf(image);
    if (this.falling.contains(image)) {
      this.falling.remove(image);
      (image.body as Phaser.Physics.Arcade.Body).enable = false;
    }
  }
}
