export const GAME_W = 400;
export const GAME_H = 225;
export const TILE = 16;
export const GROUND_Y = GAME_H - 33;
export const BIRD_SCREEN_X = GAME_W * 0.3;

export const SLIDE_HEADROOM = 22;

const BUBBLE_W = 220, BUBBLE_PAD = 6, BUBBLE_PORTRAIT = 24;
export const BUBBLE = { w: BUBBLE_W, pad: BUBBLE_PAD, portrait: BUBBLE_PORTRAIT, textW: BUBBLE_W - BUBBLE_PAD * 3 - BUBBLE_PORTRAIT, maxLines: 2 };

export const GRAVITY = 900;

export const DEPTH = {
  backdrop: -10, decor: -1, ground: 0, plank: 1, veil: 2, pickup: 5, glow: 6, carried: 7, enemy: 8, barrier: 9, dust: 9,
  player: 10, branch: 11, ceiling: 11.5, fx: 12, sparks: 15, controls: 100, controlIcons: 101,
};

export const DROP_BEHIND = 64;

/** Px: the tower's bricks lie in courses `h` high, every other one shifted by half a brick; the wall's are `wallW` wide, and it breaks along them. */
export const BRICK = { h: 8, wallW: 10 };
/** The row of each of Grey's dig images (fx.crater, fx.furrow, fx.plow) that lies on the floor line. */
export const DIG_FLOOR = { crater: 5, furrow: 1, plow: 8 };

export const RETRY_DELAY = 800;

/** ms from bright to faint: the first web's hint and the boss hint's ring */
export const HINT_BLINK_MS = 320;

export const MAX_FRAME_MS = 100;
export const frameDt = (delta: number): number => Math.min(delta, MAX_FRAME_MS) / 1000;

// The block checker simulates with these; the reach rules at the top of track/meadow.ts follow from them.
export const PLAYER = {
  runSpeed: 145,
  jumpVel: -320,
  jumpCutVel: -120,
  airJumpVel: -280,
  glideFallCap: 40,
  maxFall: 600,
  coyoteMs: 100,
  bufferMs: 120,
  minSlideMs: 450,
  hurtMs: 300,
  hurtHopVel: -180,
  blinkEveryMs: 80,
};

export const BIRD_BOX = { w: 14, h: 30, slideW: 18, slideH: 12 };

export const PICKUP_GRACE = { x: 5, y: 7 };

export const swoopY = (boxH: number, gap: number): number => GROUND_Y - BIRD_BOX.slideH - gap - boxH / 2;

export const SWINGS = {
  peck: {
    activeMs: 140,
    cooldownMs: 300,
    reach: 22,
    top: 34,         // above the feet; over BIRD_BOX.h, so what can hit the bird from the front can be pecked
    bottom: 6,
  },
  cleave: { activeMs: 170, cooldownMs: 360, reach: 36, top: 38, bottom: 2 },
};
export type Swing = keyof typeof SWINGS;

export const DASH = {
  speed: 345,
  ms: 260,
  cooldownMs: 2000,
};

// Game px. A touch goes to the nearest button on its half of the screen, so the discs are only anchors.
export type ButtonId = 'jump' | 'slide' | 'attack' | 'dash';
const BUTTON_R = 20, BUTTON_EDGE = 10;
const CORNER = { x: BUTTON_EDGE + BUTTON_R, y: GAME_H - BUTTON_EDGE - BUTTON_R };
const INNER = { x: CORNER.x + 40, y: CORNER.y - 40 };
export const TOUCH: { buttonR: number; buttons: Record<ButtonId, { x: number; y: number }> } = {
  buttonR: BUTTON_R,
  buttons: {
    slide: CORNER,
    attack: INNER,
    jump: { x: GAME_W - CORNER.x, y: CORNER.y },
    dash: { x: GAME_W - INNER.x, y: INNER.y },
  },
};
