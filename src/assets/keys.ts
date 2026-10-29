import type Phaser from 'phaser';
import type { AnimKey, TextureKey } from './manifest';

// Phaser takes any string; these fail to compile on a key that isn't in the manifest.
export const tex = <K extends TextureKey>(key: K): K => key;
export const anim = <K extends AnimKey>(key: K): K => key;

/** A sheet's own frames: Phaser's frameTotal counts its __BASE frame too. */
export const frameCount = (texture: Phaser.Textures.Texture): number => texture.frameTotal - 1;
