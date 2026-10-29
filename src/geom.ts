/** x, y: its left and top */
export interface Box { x: number; y: number; w: number; h: number }

export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
