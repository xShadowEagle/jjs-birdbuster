import type Phaser from 'phaser';
import type Boss from './Boss';
import type { BossSpec } from './Boss';
import Grey from './Grey';
import Teal from './Teal';
import Lime, { type LimePart } from './Lime';

export function makeBoss(scene: Phaser.Scene, cameraLeft: number, spec: BossSpec, part?: LimePart): Boss<string> {
  switch (spec.rival) {
    case 'grey': return new Grey(scene, cameraLeft, spec);
    case 'teal': return new Teal(scene, cameraLeft, spec);
    case 'lime': return new Lime(scene, cameraLeft, spec, part);
    default: return spec.rival satisfies never;
  }
}
