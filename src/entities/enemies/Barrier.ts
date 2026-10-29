import type Phaser from 'phaser';
import { DEPTH, GROUND_Y } from '../../constants';
import { tex } from '../../assets/keys';
import type { ImageKey } from '../../assets/manifest';
import Enemy, { type Arena, type Attack } from './Enemy';
import { smashWall, tearWeb, type Break } from './breaks';

interface Kind { texture: ImageKey; boxW: number; weakTo: readonly Attack[]; breaks: Break }

const WEB: Kind = { texture: 'world.jungle.web', boxW: 12, weakTo: ['cleave', 'dash'], breaks: tearWeb };
const WALL: Kind = { texture: 'world.tower.wall', boxW: 14, weakTo: ['dash'], breaks: smashWall };

export default class Barrier extends Enemy {
  readonly boxW: number;
  readonly boxH = GROUND_Y;
  override readonly weakTo: readonly Attack[];

  constructor(scene: Phaser.Scene, x: number, private readonly kind: Kind) {
    super(scene, x, GROUND_Y / 2, tex(kind.texture));
    this.boxW = kind.boxW;
    this.weakTo = kind.weakTo;
    this.setDepth(DEPTH.barrier);
    scene.add.existing(this);
  }

  protected move(): void {}

  protected override leave(arena: Arena): void {
    const b = arena.player.box;
    this.kind.breaks(this.scene, this, b.y + b.h / 2);
    this.setVisible(false);
    this.gone = true;
  }
}

export class Web extends Barrier {
  constructor(scene: Phaser.Scene, x: number) { super(scene, x, WEB); }
}

export class Wall extends Barrier {
  constructor(scene: Phaser.Scene, x: number) { super(scene, x, WALL); }
}
