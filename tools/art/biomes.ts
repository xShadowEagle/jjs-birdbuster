import { mix, seeThrough, type Img, type PixelFn, type Px } from './lib/pixels.ts';
import { asciiImage, image, pixelsOf, sheet } from './lib/assets.ts';
import { DUST, OUTLINE } from './palette.ts';
import { bayer, ell, fluffy, noise, rell, segDist } from './lib/shapes.ts';
import { BRICK, DIG_FLOOR, GAME_H, GAME_W, GROUND_Y } from '../../src/constants.ts';
import { BIOMES } from '../../src/world/biomes.ts';
import type { ImageKey } from '../../src/assets/manifest.ts';

// Grounds are horizontally seamless: every pattern period divides 64.
const GROUND_W = 64;

const SWAMP = { mossHi: 0xb5c40c, moss: 0x88aa0b, mossMid: 0x6e921a, mossDark: 0x4e751c, mud: 0x444422, mudHi: 0x666644, mudDark: 0x2c2c1c, root: 0x442222, water: 0x1c3a2c, waterHi: 0x448844, sheen: 0x88aa66, stone: 0x888866, stoneDark: 0x666644, red: 0xee2222, redDark: 0x880000, redHi: 0xee643e, cream: 0xeedd99, reed: 0x8a5a2c, reedDark: 0x5a3418 };
const JUNGLE = { leafDark: 0x314c1a, leaf: 0x518314, leafHi: 0x71b224, leafTop: 0xa4d64a, earth: 0xa3482c, earthHi: 0xc7651a, earthDark: 0x713423, deep: 0x472a20, pebble: 0xdb894f, petal: 0xee4a2a, petalHi: 0xff8a4a, core: 0xffd84a };
const WOODS = { leafDark: 0x3a3208, leaf: 0x5e5810, leafHi: 0x857d16, leafTop: 0xb4a830, stem: 0x4a4410, stemHi: 0x76701c, petal: 0xf6a8c8, petalDark: 0xe0709a, flowerCore: 0xffe08a };
const TOWER = { ledgeHi: 0xbdbd94, ledge: 0x94946a, ledgeDark: 0x83754e, brick: 0x4a4a6a, brickHi: 0x6a6a8a, brickDark: 0x34365c, mortar: 0x20204a, moss: 0x4a6a6a, edge: 0x2a2a44 };

const speck = (x: number, y: number, salt: number) => noise((x >> 1) + salt * 97, y >> 1);
const deeper = (x: number, y: number, from: number, to: number) => y >= to || (y > from && bayer(x, y) < (y - from) / (to - from));
const brickAt = (x: number, y: number, w: number) => {
  const course = Math.floor(y / BRICK.h), along = x + (course % 2 ? w / 2 : 0), bx = along % w, by = y % BRICK.h;
  return { course, n: Math.floor(along / w), mortar: by === BRICK.h - 1 || bx === w - 1, lit: by === 0 || bx === 0 };
};

export function makeBiomes(out: Img[]): void {
  meadow(out);
  woods(out);
  swamp(out);
  jungle(out);
  tower(out);
  nest(out);
  sunset(out);
  stomp(out);
}

function meadow(out: Img[]): void {
  const G = { tuft: 0xa6d86a, light: 0x8fc25a, grass: 0x6fa844, dark: 0x4f8a3a, dirtTop: 0x7a5230, dirt: 0x6b4527, speck: 0x5a3a20, stone: 0x8c7a66 };
  image(out, 'world.meadow.ground', GROUND_W, 48, (x, y) => {
    const n = noise(x, y);
    if (y === 0) return noise(x, 99) > 0.55 ? G.tuft : null;
    if (y <= 2) return G.light;
    if (y <= 4) return n > 0.8 ? G.light : G.grass;
    if (y === 5) return noise(x, 5) > 0.4 ? G.grass : G.dark;
    if (y === 6) return noise(x, 6) > 0.65 ? G.dark : G.dirtTop;
    if (n > 0.965) return G.stone;
    if (n > 0.9) return G.speck;
    return y < 12 ? G.dirtTop : G.dirt;
  });

  image(out, 'world.meadow.plank', 16, 6, (x, y) => {
    if (y === 0) return 0xe0ad72;
    if (y === 5) return 0x6b4527;
    if (x === 15) return 0x8a5a32;
    if (y === 2 && x === 3) return 0x4a3020;
    return y === 1 ? 0xc98f55 : 0xb07a45;
  });

  const flower = (key: ImageKey, petal: number) => asciiImage(out, key, [
    '.p.p.',
    'ppcpp',
    '.ppp.',
    '..g..',
    '.gg..',
    '..g..',
    '..g..',
  ], { p: petal, c: 0xfff3b0, g: 0x4f8a3a });
  flower('world.meadow.flower_pink', 0xf28cb1);
  flower('world.meadow.flower_blue', 0x8cc8f2);
  flower('world.meadow.flower_white', 0xfff0f0);

  const clusters = [[6, 12, 4.5], [11, 8, 5.5], [18, 7, 6], [24, 10, 4.5], [14, 12, 5], [20, 13, 4]];
  const bush = (key: ImageKey, berry: number | null) => image(out, key, 30, 18, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (py > 17) return null;
    const hit = clusters.filter(([cx, cy, r]) => Math.hypot(px - cx, py - cy) <= r).sort((a, b) => a[1] - b[1])[0];
    if (!hit) return null;
    const [cx, cy, r] = hit;
    if (berry !== null && [[9, 10], [17, 9], [22, 13], [13, 14]].some(([bx, by]) => x === bx && y === by)) return berry;
    const light = (-(px - cx) * 0.6 - (py - cy) * 0.8) / r;              // +1 lit edge to -1 shaded edge
    const b = bayer(x, y);
    if (noise(x, y) > 0.9) return 0x2f6a2c;
    if (light > 0.45 || (light > 0.2 && b < 0.5)) return 0x7cc05a;
    if (light < -0.35 || (light < -0.1 && b < 0.5)) return 0x3a7a38;
    return 0x55994a;
  }, 0x24502a);
  bush('world.meadow.bush', null);
  bush('world.meadow.bush_berries', 0xe0405a);
}

function woods(out: Img[]): void {
  const C = WOODS;
  // the vines tile vertically: everything repeats every 16 px
  const BRANCH_W = 24, TAU = Math.PI * 2, LEAF = 1.2;
  const STRANDS = [
    { x: 6, amp: 1, phase: 0, w: 1.6, leafAt: 2, tip: 13 },
    { x: 12, amp: 1.3, phase: 5, w: 1.8, leafAt: 6, tip: 15 },
    { x: 18, amp: 1, phase: 10, w: 1.6, leafAt: 10, tip: 11 },
  ];
  const along = (s: (typeof STRANDS)[number], y: number) => s.x + s.amp * Math.sin((TAU * (y + s.phase)) / 16);
  const FLOWER = ['.p.p.', 'ppcpp', '.ppp.'];
  const FLOWERS: [number, number, boolean][] = [[0, 8, false], [2, 4, false], [1, 14, true], [0, 12, true]];
  const vines = (end: boolean): PixelFn => (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    for (const [i, fy, tip] of FLOWERS) {
      if (tip && !end) continue;
      const c = FLOWER[y - (fy - 1)]?.[x - (Math.round(along(STRANDS[i], fy)) - 2)];
      if (c === 'c') return C.flowerCore;
      if (c === 'p') return y === fy + 1 ? C.petalDark : C.petal;
    }
    for (const s of STRANDS) {
      const stop = end ? s.tip : Infinity;
      for (let k = 0; k < 2; k++) {
        const ly = (s.leafAt + k * 8) % 16;
        if (ly > 12 || ly + 2 > stop) continue;
        const side = (k + Math.round(s.x)) % 2 ? 1 : -1, lx = along(s, ly) + side * 2.8 * LEAF, lcy = ly + 1.4 * LEAF;
        if (rell(px, py, lx, lcy, 2.6 * LEAF, 1.4 * LEAF, side * 30)) {
          const lit = (lcy - py) / (1.4 * LEAF);
          return lit > 0.35 ? C.leafTop : lit > -0.45 ? C.leafHi : C.leaf;
        }
      }
      if (py > stop) continue;
      const cx = along(s, py);
      if (Math.abs(px - cx) < s.w / 2) return px < cx ? C.stemHi : C.stem;
    }
    return null;
  };
  image(out, 'world.woods.branch', BRANCH_W, 16, vines(false), C.leafDark);
  image(out, 'world.woods.branch_end', BRANCH_W, 16, vines(true), C.leafDark);
  asciiImage(out, 'world.woods.berry_bush', [
    '.................................',
    '...............LL................',
    '.............LLLlll..............',
    '.............LLllll..............',
    '...........LlLllllmm.ll..........',
    '.........LLLlllllmmllllmm........',
    '........LLlllllmmmmlmmmmmm.......',
    '........Llllllmmmmlmmmmmmm.......',
    '.......LLllllllmmllmmmmmmmd......',
    '.......LLlllmllmmllmmmmmmdd......',
    '.......LllRRmmmmmmmmmmmmddl......',
    '......LLLmRkmmmmmmmmmmmddldd.....',
    '.....LLlmmmmmmmmmmmmmmddddddd....',
    '....LLlmmllmmmmllmmmlldddRRddd...',
    '....LLmmmllmmmmllmmdlldddRkddd...',
    '....Llmmmllmmmmllmddlldddddddd...',
    '....lmmrrlmmmmmlmdddlddddddddd...',
    '...lllmrkmmmmmmmddddddddddddd....',
    '..llmmlmmmmlmmddddddddlddddddd...',
    '..lmmmlmmmlmmdldddldddrrdddddd...',
    '.llmmllmmllmdllddllddlrkdddduud..',
    '.llmmllmmllddluudllddllddddduKd..',
    '..mmmmmmmmdddduKdddddddddddddd...',
    '..mmmmmmdddddddddddddddddddddd...',
    '...mmmmdddddddddddddddddddddd....',
    '.....md..dd..dd..dd..dd..dd......',
    '.................................',
  ], { L: 0xbcae2e, l: 0x968a2b, m: 0x747029, d: 0x5a5525, R: 0xc42438, r: 0x8e1428, k: 0x5a0a18, u: 0x8c8417, K: 0x5e5810 }, OUTLINE);
}

function swamp(out: Img[]): void {
  const C = SWAMP;
  const s = BIOMES.swamp.groundOverhang ?? 0;
  image(out, 'world.swamp.ground', GROUND_W, 48 + s, (x, py) => {
    const y = py - s;                                                    // 0 = walkable line
    if (y < 0) {
      const h = Math.floor(noise(x, 1) * 5) - 1;
      return -y <= h ? (-y === h ? C.mossHi : C.moss) : null;
    }
    if (y <= 2) return y === 0 ? C.moss : C.mossMid;
    const drip = 3 + (noise(x, 7) > 0.55 ? Math.floor(noise(x, 8) * 7) : Math.floor(noise(x, 8) * 2));
    if (y < drip) return y === drip - 1 ? C.mossDark : C.mossMid;
    for (const [cx, cy, rx, ry] of [[14, 17, 9, 3], [46, 31, 10, 3.5]]) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d <= 1) {
        if (y + 0.5 < cy - ry * 0.4) return d > 0.7 ? C.mudDark : C.waterHi;
        return Math.abs(x - cx + 2) < 2 && y + 0.5 < cy + 0.5 ? C.sheen : C.water;
      }
    }
    for (const [cx, cy, r] of [[30, 12, 3.5], [58, 38, 4]]) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) return y + 0.5 < cy - 1.5 ? C.mossMid : x + 0.5 < cx ? C.stone : C.stoneDark;
    }
    const n = speck(x, y, 1);
    if (n > 0.93) return C.root;
    if (n > 0.84) return C.mudHi;
    return deeper(x, y, 22, 40) ? C.mudDark : C.mud;
  });

  image(out, 'world.swamp.plank', 16, 7, (x, y) => {
    if (y === 0) return noise(x, 31) > 0.35 ? C.mossHi : C.moss;
    if (y === 1) return C.moss;
    if (y === 2) return noise(x, 32) > 0.5 ? C.mossDark : C.mudHi;
    if (y === 6) return C.mudDark;
    if ((x === 11 || x === 12) && (y === 3 || y === 4)) return y === 3 ? C.mudDark : C.root;
    return (x + y * 3) % 7 === 0 ? C.mud : y === 3 ? C.stoneDark : C.mudHi;
  });

  image(out, 'world.swamp.cattails', 11, 20, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    for (const [sx, top] of [[2, 3], [5, 0], [8, 5]]) {
      if (x === sx && y >= top && y < top + 5) return y === top + 1 ? C.reed : C.reedDark;
      if (x === sx && y === top - 1) return C.mossMid;
      if (x === sx + 1 && y > top && y < top + 5) return C.reed;
      if (x === sx && y >= top + 5) return C.mossMid;
    }
    if (segDist(px, py, 5.5, 19.5, 1, 9) < 0.7 || segDist(px, py, 5.5, 19.5, 10, 11) < 0.7) return C.moss;
    return null;
  });

  image(out, 'world.swamp.shrooms', 13, 11, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    for (const [cx, cy, r, stem] of [[4.5, 4, 4, 4], [10, 7, 3, 2]]) {
      if (py <= cy && ell(px, py, cx, cy, r, r * 0.8)) {
        if ((x === Math.floor(cx) - 1 && y === Math.floor(cy) - 2) || (x === Math.floor(cx) + 1 && y === Math.floor(cy) - 1)) return C.cream;
        return py > cy - 1 ? C.redDark : px < cx - 1 ? C.redHi : C.red;
      }
      if (py > cy && py <= cy + stem && Math.abs(px - cx) < 1.1) return px < cx ? C.cream : C.stone;
    }
    return null;
  }, 0x1c1c10);

  image(out, 'world.swamp.stump', 24, 16, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const body = py >= 3 && Math.abs(px - 12) <= 8 + Math.max(0, py - 11) * 0.8;
    if (!body && !ell(px, py, 12, 3.5, 8, 2.5)) return null;
    if (ell(px, py, 12, 3.5, 8, 2.5)) {
      if (!ell(px, py, 12, 3.5, 6, 1.6)) return py < 3.5 ? C.mossHi : C.moss;
      return ell(px, py, 12, 3.5, 3, 0.8) ? C.reed : C.reedDark;
    }
    if (py < 7 + noise(x, 41) * 3) return C.mossMid;
    if (x % 4 === 1) return C.mudDark;
    return px < 9 ? C.mudHi : C.mud;
  }, 0x1c1c10);
}

function jungle(out: Img[]): void {
  const C = JUNGLE;
  const s = BIOMES.jungle.groundOverhang ?? 0;
  const leaf = (x: number, y: number) => {
    for (let k = 0; k < 8; k++) {
      const cx = k * 8 + 4 + (noise(k, 21) - 0.5) * 3, h = 5 + Math.floor(noise(k, 22) * (s - 3));
      const lean = (noise(k, 23) - 0.5) * 0.6, top = s - h;
      if (y < top || y > s + 2) continue;
      const t = (y - top) / (h + 2), half = 0.8 + t * 3.2;
      const dx = x + 0.5 - (cx + lean * (s - y));
      if (Math.abs(dx) <= half) return { dx, half, y, top, k };
    }
    return null;
  };
  image(out, 'world.jungle.ground', GROUND_W, 48 + s, (x, py) => {
    const l = leaf(x, py) ?? leaf(x + GROUND_W, py) ?? leaf(x - GROUND_W, py);       // wrap across the seam
    if (l) {
      if (Math.abs(l.dx) < 0.6 && py > l.top + 1) return C.leafDark;
      if (py <= l.top + 1) return C.leafTop;
      return l.dx < 0 ? C.leafHi : C.leaf;
    }
    const y = py - s;
    if (y < 0) return null;
    if (y <= 3) return y === 0 ? C.leafHi : deeper(x, y, 0, 4) ? C.earthDark : C.leaf;
    const ry = 16 + Math.round(Math.sin((x / GROUND_W) * Math.PI * 4) * 3);
    if (Math.abs(y - ry) < 0.6 && noise(x >> 2, 11) > 0.35) return C.deep;
    for (const [cx, cy] of [[9, 26], [37, 12], [52, 34], [24, 40]]) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.4);
      if (d <= 2.2) return d < 1.1 && x + 0.5 < cx ? C.pebble : C.earthHi;
    }
    const n = speck(x, y, 2);
    if (n > 0.9) return C.earthHi;
    if (n < 0.08) return C.earthDark;
    return deeper(x, y, 24, 42) ? C.earthDark : C.earth;
  });

  image(out, 'world.jungle.plank', 16, 7, (x, y) => {
    if (y === 0) return noise(x, 51) > 0.45 ? C.leafTop : C.leafHi;
    if (y === 1) return (x + 1) % 8 < 3 ? C.leaf : C.earthHi;
    if (y === 6) return C.deep;
    if ((x + y * 2) % 8 === 0 || (x + y * 2) % 8 === 1) return (x + y * 2) % 8 === 0 ? C.leafHi : C.leafDark;
    return y === 2 ? C.earthHi : y === 5 ? C.earthDark : C.earth;
  });

  const WEB = { silk: 0xfafaff, sheen: 0xdcdaf0, shade: 0xa8a4cc, dew: 0xffffff };
  const sag = (px: number, py: number, [ax, ay]: number[], [bx, by]: number[], depth: number) => {
    let best = 9;
    const at = (t: number) => [ax + (bx - ax) * t, ay + (by - ay) * t + depth * 4 * t * (1 - t)];
    for (let i = 0; i < 24; i++) {
      const [x0, y0] = at(i / 24), [x1, y1] = at((i + 1) / 24);
      best = Math.min(best, segDist(px, py, x0, y0, x1, y1));
    }
    return best;
  };
  const silk: PixelFn = (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    for (let k = 0; k < 7; k++) {
      const cx = 2.5 + k * 2.85 + Math.sin(py / 41 + k * 0.9) * 0.9;
      if (Math.abs(px - cx) < 0.5) return k % 2 === 0 && Math.sin(y / 11 + k * 1.7) > -0.35 ? WEB.silk : WEB.sheen;
    }
    for (let i = 0, yy = 18; yy < GROUND_Y - 6; i++, yy += 27) {
      if (sag(px, py, [2, yy], [20, yy + (i % 2) * 4], 3.2) < 0.5) return WEB.silk;
    }
    return (x * 5 + y * 7) % 131 === 0 ? WEB.dew : null;
  };
  image(out, 'world.jungle.web', 22, GROUND_Y, (x, y) => {
    const v = silk(x, y);
    if (v !== null) return v;
    const left = x > 0 ? silk(x - 1, y) : null;
    return left === WEB.silk || left === WEB.dew ? WEB.shade : null;
  });

  const frond = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const d = segDist(px, py, ax, ay, bx, by);
    const t = Math.hypot(px - ax, py - ay) / Math.hypot(bx - ax, by - ay);
    return d < 0.6 ? 2 : d < 1.8 * (1 - t) + 0.4 && Math.floor(t * 10) % 2 === 0 ? 1 : 0;
  };
  image(out, 'world.jungle.fern', 17, 12, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    let hit = 0;
    for (const [bx, by] of [[1, 5], [4.5, 1], [8.5, 0], [12.5, 1], [16, 5]]) hit = Math.max(hit, frond(px, py, 8.5, 12, bx, by));
    return hit === 2 ? C.leafDark : hit === 1 ? (px < 8.5 ? C.leafHi : C.leaf) : null;
  }, C.leafDark);

  image(out, 'world.jungle.flower', 11, 13, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (ell(px, py, 5.5, 4, 1.2, 1.2)) return C.core;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      if (ell(px, py, 5.5 + Math.cos(a) * 2.6, 4 + Math.sin(a) * 2.4, 1.8, 1.8)) return py < 3.5 ? C.petalHi : C.petal;
    }
    if (x === 5 && y > 6) return C.leafDark;
    if (ell(px, py, 3, 9.5, 2.2, 1) || ell(px, py, 8, 10.5, 2.2, 1)) return C.leaf;
    return null;
  }, C.leafDark);

  image(out, 'world.jungle.leafbush', 30, 20, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const leaves: [number, number, number][] = [[3, 9, 3.2], [9, 2, 3.8], [15, 0.5, 4], [21, 2, 3.8], [27, 9, 3.2], [7, 12, 2.6], [23, 12, 2.6]];
    for (const [tx, ty, w] of leaves) {
      const L = Math.hypot(15 - tx, 20 - ty), ux = (15 - tx) / L, uy = (20 - ty) / L;
      const along = (px - tx) * ux + (py - ty) * uy, across = (px - tx) * -uy + (py - ty) * ux;
      if (along < 0 || along > L) continue;
      const t = along / L, half = w * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (1 - t * 0.5);
      if (Math.abs(across) > half) continue;
      if (Math.abs(across) < 0.55 && t > 0.1) return C.leafDark;
      return t < 0.15 ? C.leafTop : across < 0 ? C.leafHi : C.leaf;
    }
    return null;
  }, C.leafDark);
}

function tower(out: Img[]): void {
  const C = TOWER;
  image(out, 'world.tower.ground', GROUND_W, 48, (x, y) => {
    if (y === 0) return C.ledgeHi;
    if (y <= 3) return x % 16 === 15 || y === 3 ? C.ledgeDark : C.ledge;
    if (y === 4) return C.mortar;
    const { course, n, mortar, lit } = brickAt(x, y - 5, 16);
    if (mortar) return C.mortar;
    const shade = noise(n % 4, course);
    if (noise(x, y) > 0.96) return C.moss;
    if (lit) return shade > 0.6 ? C.brickHi : C.brick;
    return shade > 0.75 ? C.brickDark : C.brick;
  });

  image(out, 'world.tower.wall', 20, GROUND_Y, (x, y) => {
    const { course, n, mortar, lit } = brickAt(x, y, BRICK.wallW);
    if (x === 0 || x === 19 || mortar) return C.mortar;
    const crack = 10 + Math.round(Math.sin(y / 5) * 2 + Math.sin(y / 13) * 2);
    if (Math.abs(x - crack) < 1) return C.mortar;
    if (lit) return C.brickHi;
    return noise(n, course) > 0.7 ? C.brickDark : C.brick;
  });

  image(out, 'world.tower.plank', 16, 6, (x, y) => {
    if (y === 0) return C.ledgeHi;
    if (y === 5) return C.mortar;
    if (x === 15 || y === 4) return C.ledgeDark;
    return noise(x, y + 60) > 0.9 ? C.ledgeDark : C.ledge;
  });

  const overhang = (end: boolean): PixelFn => (x, y) => {
    const cut = 7 + Math.floor(noise(x >> 1, 7) * 7);
    if (end && y > cut) return null;
    const { course, n, mortar, lit } = brickAt(x, y, 16);
    if (mortar) return C.mortar;
    if (end && y >= cut - 1) return C.brickDark;
    if (lit) return C.brickHi;
    return noise(n, course + (end ? 30 : 0)) > 0.7 ? C.brickDark : C.brick;
  };
  image(out, 'world.tower.overhang', 16, 16, overhang(false), C.edge);
  image(out, 'world.tower.overhang_end', 16, 16, overhang(true), C.edge);

  const IRON = { mid: 0x5a5a78, hi: 0x9a9ab4 }, CEILING_H = 12;
  const CHAINS: [number, number, 'hook' | 'ring' | 'none'][] = [[38, 18, 'hook'], [141, 27, 'ring'], [207, 12, 'none']];
  image(out, 'world.tower.ceiling', 256, 44, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (y < CEILING_H) {
      if (y >= 9) return y === 11 ? C.ledgeDark : C.ledge;
      const { n, mortar, lit } = brickAt(x, y, 16);
      if (mortar || y === 8) return C.mortar;
      if (lit) return C.brickHi;
      return noise(n % 16, 0) > 0.7 ? C.brickDark : C.brick;
    }
    for (const [cx, len, end] of CHAINS) {
      const top = CEILING_H, d = py - top;
      if (d < 0 || d > len + 5) continue;
      if (d > len) {
        if (end === 'hook' && (segDist(px, py, cx + 0.5, top + len, cx + 0.5, top + len + 3) < 0.7 || segDist(px, py, cx + 0.5, top + len + 3, cx + 2.5, top + len + 2) < 0.7)) return IRON.hi;
        if (end === 'ring' && Math.abs(Math.hypot(px - (cx + 0.5), py - (top + len + 2.5)) - 2) < 0.6) return IRON.mid;
        continue;
      }
      const link = Math.floor(d / 4) % 2, ly = d % 4;
      if (link === 0 ? Math.abs(Math.hypot(px - (cx + 0.5), (ly - 2) * 0.8) - 1.4) < 0.55 : Math.abs(px - (cx + 0.5)) < 0.6) return px < cx + 0.5 ? IRON.hi : IRON.mid;
    }
    return null;
  }, C.edge);

  image(out, 'world.tower.rubble', 13, 6, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (px >= 1 && px <= 7 && py >= 2) return py < 3 ? C.brickHi : C.brick;
    if (segDist(px, py, 9, 4.5, 11.5, 4.5) < 1.1) return py < 4 ? C.brickHi : C.brickDark;
    if (ell(px, py, 5, 1.5, 1.6, 1)) return C.ledge;
    return null;
  }, C.mortar);
}

function nest(out: Img[]): void {
  const SINK = { back: 48, mountains: 60 };
  const SKY = 0x202020, FAR_TOP = 96;
  const MOON = { x: 292, y: 27, r: 11 };
  const C = {
    light: 0xe8f4f0, mid: 0xbcdcdc, shade: 0x84b4c0, crater: 0xa4c8cc, halo: 0x2a2a5a,
    cloud: 0x20204a, cloudUnder: 0x20206a, cloudEdge: 0x4a2094, moonlight: 0xd8f0ff,
    starDim: 0x8c9cc0, star: 0xe8f0ff, starCyan: 0x7ce8f0, starPurple: 0xb08cff,
  };

  const sunk = (key: ImageKey, from: ImageKey, by: number, clear: (c: number, y: number) => boolean = () => false) => {
    const src = pixelsOf(out, from);
    image(out, key, src.w, src.h, (x, y) => {
      const c = y - by < 0 ? null : src.px[(y - by) * src.w + x];
      return c === null || clear(c, y - by) ? null : c;
    });
  };
  sunk('world.nest.back', 'world.tower.back', SINK.back, (c, y) => c === SKY && y < FAR_TOP);
  sunk('world.nest.mountains', 'world.tower.mountains', SINK.mountains);

  const { x: mx, y: my, r } = MOON;
  const inCloud = (x: number, y: number) =>
    fluffy(x + 0.5, y + 0.5, mx - r * 0.3, my + r * 0.62, r * 1.9, 3.2, 9, 0.22) || fluffy(x + 0.5, y + 0.5, mx + r * 1.1, my + r * 0.42, r * 0.75, 2.4, 5, 0.25);
  const cloud = (x: number, y: number): Px => {
    if (!inCloud(x, y)) return null;
    if (!inCloud(x, y - 1)) return Math.hypot(x - mx, y - 1 - my) <= r + 1 ? C.mid : C.cloudEdge;
    return inCloud(x, y + 1) ? C.cloud : C.cloudUnder;
  };
  const CRATERS = [[-0.3, -0.2, 0.24], [0.28, 0.32, 0.17], [0.12, -0.5, 0.12], [-0.45, 0.42, 0.1]];
  const moon = (x: number, y: number): Px => {
    const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy) / r;
    if (d > 1) {
      const past = (d - 1) * r;
      return past < 5 && bayer(x, y) < (1 - past / 5) * 0.55 ? C.halo : null;
    }
    for (const [cx, cy, cr] of CRATERS) {
      const ex = dx / r - cx, ey = dy / r - cy;
      if (Math.hypot(ex, ey) < cr) return ex + ey > cr * 0.6 ? C.light : C.crater;
    }
    const dark = (-dx + dy) / (r * Math.SQRT2);
    if (dark > 0.62 || (dark > 0.38 && bayer(x, y) < (dark - 0.38) / 0.24)) return C.shade;
    return d > 0.86 && dark < 0 ? C.light : dark > 0.1 ? C.mid : C.light;
  };
  const CROSSES = [[64, 12], [356, 26]];
  image(out, 'world.nest.sky', GAME_W, GAME_H, (x, y) => {
    const m = cloud(x, y) ?? moon(x, y);
    if (m !== null) return m;
    if (Math.hypot(x - mx, y - my) < r + 7) return null;
    for (const [cx, cy] of CROSSES) {
      if (x === cx && y === cy) return C.star;
      if ((Math.abs(x - cx) === 1 && y === cy) || (Math.abs(y - cy) === 1 && x === cx)) return C.starDim;
    }
    if (y >= 120 || noise(x * 7 + 3, y * 13 + 1) <= 1 - 0.012) return null;
    const k = noise(x + 41, y + 7);
    return k > 0.92 ? C.starCyan : k > 0.86 ? C.starPurple : k > 0.6 ? C.star : C.starDim;
  });
  const BANDS = [0.2, 0.12, 0.06, 0.025];
  image(out, 'world.nest.glow', GAME_W, GAME_H, (x, y) => {
    const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my), reach = r * 3.4;
    if (d <= r + 0.5 || d >= reach) return null;
    const t = 1 - (d - r) / (reach - r), a = 0.3 * t * t;
    const band = BANDS.find(b => a >= b * (0.75 + 0.5 * bayer(x, y)));
    return band === undefined ? null : seeThrough(C.moonlight, band);
  });
}

function sunset(out: Img[]): void {
  // sky: top to bottom; mountains: body, lit, highlight; trees: darkest to lightest;
  // ground: the colour it's warmed towards, how far, how much darker
  const look = {
    sky: [0x2a2a6a, 0x5a3a8a, 0xa8509a, 0xe8708a, 0xffa080], sun: [0xfff0e0, 0xffc0a0, 0xff9070], cloud: [0x4a3a7a, 0x9a5a9a, 0xffa0a0],
    mountains: [0x3a2a6a, 0x5a3a7a, 0x9a5a8a], trees: [0x1e1a3a, 0x2a2a4a, 0x3a4a4a, 0x5a6a4a, 0xa87a6a],
    ground: { tint: 0x8a5a7a, k: 0.35, dim: 0.78 },
  };
  // the pack's colours, as `look` lists theirs
  const MOUNTAINS = [0x024aca, 0x0a89ff, 0x5ba8ff], TREES = [0x005280, 0x0a98ac, 0x20b562, 0x58d332, 0x8cd612];
  const repaint = (key: ImageKey, from: ImageKey, colour: (c: number) => number | undefined) => {
    const src = pixelsOf(out, from);
    return image(out, key, src.w, src.h, (x, y) => {
      const c = src.px[y * src.w + x];
      if (c === null) return null;
      const to = colour(c);
      if (to === undefined) throw new Error(`${from}: no sunset colour for ${c.toString(16)}`);
      return to;
    });
  };
  const mountains = repaint('world.sunset.mountains', 'world.meadow.mountains', c => look.mountains[MOUNTAINS.indexOf(c)]);
  repaint('world.sunset.trees', 'world.meadow.trees', c => look.trees[TREES.indexOf(c)]);
  const { tint, k, dim } = look.ground;
  repaint('world.sunset.ground', 'world.meadow.ground', c => mix(c, tint, k, dim));

  const top = (x: number) => { let y = 0; while (y < mountains.h && mountains.px[y * mountains.w + (x % mountains.w)] === null) y++; return y + GAME_H - mountains.h; };
  const R = 21;
  let sunX = 240;
  for (let x = 240; x <= 360; x++) if (top(x) > top(sunX)) sunX = x;
  const sunY = top(sunX) + 4;
  const BANDS = [30, 58, 84, 106], BLEND = 8;
  const skyAt = (x: number, y: number) => {
    let i = 0;
    for (const b of BANDS) if (y >= b + BLEND / 2 || (y > b - BLEND / 2 && bayer(x, y) < (y - (b - BLEND / 2)) / BLEND)) i++;
    return look.sky[i];
  };
  const STREAKS: [number, number, number, number][] = [[70, 30, 50, 7], [196, 46, 64, 8], [338, 36, 48, 6.5], [276, 74, 70, 9], [56, 84, 60, 8], [150, 102, 46, 6]];
  const inStreak = (x: number, y: number) => STREAKS.some(([cx, cy, rx, ry], i) => y + 0.5 <= cy + ry * 0.3 && fluffy(x + 0.5, y + 0.5, cx, cy, rx, ry, 9 + i * 2, 0.22));
  const [core, mid, rim] = look.sun, [ctop, cbody, clit] = look.cloud;
  image(out, 'world.sunset.sky', GAME_W, GAME_H, (x, y) => {
    if (inStreak(x, y)) return !inStreak(x, y + 1) ? clit : !inStreak(x, y - 1) ? ctop : cbody;
    const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY);
    if (d <= R) return d > R - 2 ? mid : core;
    if (d <= R + 2) return rim;
    const past = d - R - 2, reach = 30;
    if (past < reach && bayer(x, y) < (1 - past / reach) ** 2 * 0.6) return rim;
    return skyAt(x, y);
  });
}

function stomp(out: Img[]): void {
  const C = { ...TOWER, pit: 0x12122a };
  const FRAMES = 4;
  const pebble = (f: number, i: number, x0: number, hop: number): [number, number] => {
    const k = (f / FRAMES + i * 0.37) % 1;
    return [Math.round(x0 - k * 3), Math.round(10 - Math.sin(k * Math.PI) * hop)];
  };
  const PEBBLES: [number, number, number][] = [[0, 7, 6], [1, 12, 4]];
  sheet(out, 'fx.shockwave', Array.from({ length: FRAMES }, (_, f) => (x: number, y: number) => {
    for (const [i, x0, hop] of PEBBLES) {
      const [cx, cy] = pebble(f, i, x0, hop);
      if (x >= cx && x <= cx + 1 && y >= cy && y <= cy + (i % 2)) return y === cy ? C.ledgeHi : i % 2 ? C.brickHi : C.ledge;
    }
    const px = x + 0.5, h = [8, 9, 8.5, 7.5][f], crest = 8;
    const w = px < crest ? 4 : 8, top = 14 - h * Math.exp(-(((px - crest) / w) ** 2));
    if (y + 0.5 < top || y > 15) return null;
    const d = y + 0.5 - top;
    if (d < 1) return C.ledgeHi;
    if (d < 3) return px > crest + 3 && noise(x, 3) > 0.7 ? C.ledgeDark : C.ledge;
    if (d < 4) return C.mortar;
    if (y >= 14) return noise(x + f, y) > 0.6 ? C.mortar : C.brickDark;
    return (x + (Math.floor((y - top) / 4) % 2) * 3) % 7 === 0 ? C.mortar : C.brick;
  }));

  /** [x, rows below the floor] */
  const CRACKS: [number, number][][] = [
    [[17, 3], [15, 6], [16, 8], [13, 11]],
    [[23, 5], [24, 8], [22, 10]],
    [[33, 5], [32, 7], [34, 10]],
    [[39, 3], [42, 5], [41, 8], [44, 10]],
  ];
  const cracked = (x: number, y: number) =>
    CRACKS.some(line => line.slice(1).some(([bx, by], i) => segDist(x + 0.5, y + 0.5, line[i][0], DIG_FLOOR.crater + line[i][1], bx, DIG_FLOOR.crater + by) < 0.5));
  /** slabs: [foot x, lean (px per row up), width, height] */
  const slabAt = (slabs: number[][], foot: number, px: number, py: number) => {
    for (const [fx, lean, w, h] of slabs) {
      const up = foot - py, l = fx + lean * up;
      if (up >= 0 && up <= h && px >= l && px <= l + w) return { lean, w, l, top: up > h - 1 };
    }
    return null;
  };
  const SLABS = [[13, -0.7, 5, 5], [20, -0.35, 4, 6], [33, 0.35, 5, 6], [40, 0.8, 5, 4]];
  image(out, 'fx.crater', 56, 18, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const slab = slabAt(SLABS, DIG_FLOOR.crater + 2, px, py);
    if (slab) return slab.top ? C.ledgeHi : px < slab.l + 1.2 ? (slab.lean < 0 ? C.ledgeHi : C.ledgeDark) : C.ledge;
    if (ell(px, py, 27, DIG_FLOOR.crater + 2.5, 9, 3)) return ell(px, py, 27, DIG_FLOOR.crater + 3, 6.5, 2) ? C.pit : C.mortar;
    if (ell(px, py, 8, DIG_FLOOR.crater - 0.5, 2.5, 1.2) || ell(px, py, 47, DIG_FLOOR.crater - 0.5, 2.8, 1.2)) return py < DIG_FLOOR.crater - 0.5 ? DUST.light : DUST.edge;
    if (cracked(x, y)) return C.mortar;
    return null;
  });

  const n16 = (x: number, y: number) => noise(x % 16, y);
  image(out, 'fx.furrow', 16, 7, (x, y) => {
    const g = y - DIG_FLOOR.furrow;
    if (g < 0) return n16(x, 90) > 0.85 ? C.ledge : null;
    if (g === 0) return n16(x, 91) > 0.5 ? C.ledgeHi : C.ledgeDark;
    if (g === 1) return C.ledgeDark;
    if (g === 2) return n16(x, 92) > 0.6 ? C.ledge : C.ledgeDark;
    if (g === 3) return C.ledgeDark;
    return g === 4 ? C.mortar : null;
  });
  image(out, 'fx.plow', 24, 12, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const slab = slabAt([[5, 0.6, 5, 5], [11, 0.9, 5, 6]], DIG_FLOOR.plow + 1, px, py);
    if (slab) return slab.top ? C.ledgeHi : px > slab.l + slab.w - 1.2 ? C.ledgeDark : C.ledge;
    if (ell(px, py, 20, DIG_FLOOR.plow - 1, 3, 2) || ell(px, py, 22.5, DIG_FLOOR.plow - 2.5, 1.5, 1.3)) return py < DIG_FLOOR.plow - 1.5 ? DUST.light : DUST.edge;
    return null;
  });
}
