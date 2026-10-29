// No Phaser here: plain DOM code and the art tools use it too.
export const UI = {
  bg: 0x0b0a12,
  text: 0xfff8e0,
  dim: 0xcfc3a0,
  gold: 0xffd35a,
  panel: 0x1a1020,
  trough: 0x3a3050,
  hp: 0xe8405a,
} as const;

export const RAINBOW = [0xff4a5a, 0xff9a3a, 0xffe14a, 0x6ee05a, 0x4ab4ff, 0xa86aff] as const;

export const BG_RGB = [(UI.bg >> 16) & 255, (UI.bg >> 8) & 255, UI.bg & 255] as const;

export const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
