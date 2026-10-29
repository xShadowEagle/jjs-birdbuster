import Phaser from 'phaser';
import { GAME_W, GAME_H, GRAVITY } from './constants';
import { css, UI } from './ui/colors';

export const BASE_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: css(UI.bg), // index.html's page background matches
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY }, debug: false },
  },
};
