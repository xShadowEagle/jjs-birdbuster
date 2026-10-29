import { GAME_W, GAME_H } from './constants';
import { isTouchScreen } from './device';

/** CSS px per game pixel. Whole device px per game pixel (uneven ones mangle the font) if that gives up at most `maxLoss` of the size that fits. */
export function fitZoom(w: number, h: number, dpr: number, maxLoss: number): number {
  const fit = Math.min(w / GAME_W, h / GAME_H);
  const whole = Math.floor(fit * dpr);
  return whole >= 1 && whole / (fit * dpr) >= 1 - maxLoss ? whole / dpr : fit;
}

export const maxLossHere = (): number => (isTouchScreen() ? 0.03 : 0.2);
