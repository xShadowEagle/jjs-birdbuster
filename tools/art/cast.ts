import { ascii, type Img, type PixelFn, type Px } from './lib/pixels.ts';
import { ell, fluffy, segDist } from './lib/shapes.ts';
import { asciiImage, image, sheet } from './lib/assets.ts';
import { CAT_COLOURS, FLO, FLO_COLOURS, JJ, OUTLINE, SWORD } from './palette.ts';

/** Rows 9-13, columns 10-16 of the sprite. */
const JJ_FACE = ['hhsss..', 'sssEss.', 'sssess.', 'ssssss.', 'hssssm.'];
const JJ_FACE_COLOURS: Record<string, number> = { s: JJ.skin, E: JJ.eyeDark, e: JJ.eye, m: JJ.lips, h: JJ.hair };

/** sway: her hair, back; near, far: each ankle's [forward, lift] */
const JJ_POSES: { bob: number; sway: number; near: [number, number]; far: [number, number] }[] = [
  { bob: 0, sway: 0, near: [0, 0], far: [0, 0] },
  { bob: 1, sway: 0.5, near: [0, 0], far: [0, 0] },
  { bob: 1, sway: 0.3, near: [2.2, 0], far: [-2.2, 0] },
  { bob: 0, sway: 0.7, near: [0.2, 0], far: [-0.2, 1] },
  { bob: 1, sway: 0.3, near: [-2.2, 0], far: [2.2, 0] },
  { bob: 0, sway: 0.7, near: [-0.2, 1], far: [0.2, 0] },
];

function jjStand(frame: number): PixelFn {
  const { bob, sway, near, far } = JJ_POSES[frame];
  const wave = (v: number) => Math.sin(v * 0.9 + frame * 1.6);
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5, upperY = py - bob;
    if (Math.hypot(px - 15.4, py - 21.6) < 1.25) return JJ.glove;
    if (segDist(px, py, 13.2, 17.4 + bob, 15, 20.8) < 0.95) return JJ.jacketLight;
    if (Math.hypot(px - 17.4, py - 20.3) < 0.8) return SWORD.guard;
    if (segDist(px, py, 14.4, 22.4, 17, 20.6) < 0.6) return JJ.boot;
    if (segDist(px, py, 13.6, 21.2, 14.8, 23.6) < 0.6) return SWORD.guard;
    const f = JJ_FACE[Math.floor(upperY) - 9]?.[x - 10];
    if (f && f !== '.') return JJ_FACE_COLOURS[f];
    if (ell(px, upperY, 12, 15, 3.1, 1.3)) return JJ.scarf;
    if (segDist(px, upperY, 9.5, 15.6, 3.2, 17.6 + wave(px) * 0.8) < 0.8) return JJ.scarfDark;
    const crown = fluffy(px, upperY, 10.4, 8.2, 5.4, 5.2, 9, 0.1) && (upperY < 9 || px < 15.5);
    const back = fluffy(px, upperY, 7.6 - sway, 15, 3.6, 4.6, 7, 0.16);
    const curl = fluffy(px, upperY, 4 - sway * 1.6, 13.4 + sway, 1.8, 1.5, 5, 0.2);
    if (crown || back || curl) {
      if (ell(px, upperY, 9.4, 5.2, 2.4, 1.1) || ell(px, upperY, 13.2, 5.8, 1.2, 0.7)) return JJ.hairLight;
      if (px < 6.8 - sway || upperY > 16.5) return JJ.hairDark;
      return JJ.hair;
    }
    const flare = Math.max(0, py - 21) * 0.3;
    if (upperY >= 15.5 && py < 24.5 && px >= 9.4 - flare && px < 15.2 + flare) {
      if (Math.floor(py) === 20) return JJ.boot;
      return px < 11 ? JJ.jacketDark : JJ.jacket;
    }
    const leg = (hipX: number, ankleX: number, lift: number, isNear: boolean): Px => {
      const ay = 28.6 - lift, w = isNear ? 1.3 : 1.2, bootTop = 29 - lift;
      if (segDist(px, py, hipX, 24, ankleX, ay) < 1.05) return !isNear ? JJ.jacketDark : px > ankleX + 0.1 ? JJ.jacketLight : JJ.jacket;
      const toe = py >= 32 - lift;
      if (py < bootTop || py >= 34 - lift || px < ankleX - w || px >= ankleX + (toe ? w + 1 : w)) return null;
      return Math.floor(py) === bootTop || (isNear && px >= ankleX + 0.3 && !toe) ? JJ.bootLight : JJ.boot;
    };
    const l = leg(13.4, 13.9 + near[0], near[1], true) ?? leg(10.8, 10 + far[0], far[1], false);
    if (l !== null) return l;
    if (segDist(px, py, 12, 22.6, 5, 27.8) < 0.8) return Math.hypot(px - 5, py - 27.8) < 1.2 ? SWORD.guard : JJ.boot;
    return null;
  };
}

const jjPortrait: PixelFn = (x, y) => {
  const px = x + 0.5, py = y + 0.5;
  if (ell(px, py, 12, 12.8, 5.4, 6) && py > 7.6 + Math.max(0, 15.5 - px) * 0.32) {
    if (y === 11 && (x === 8 || x === 9 || x === 14 || x === 15)) return JJ.hairDark;
    if ((y === 12 || y === 13) && (x === 9 || x === 14)) return y === 12 ? JJ.eyeDark : JJ.eye;
    if (y === 14 && x === 12) return JJ.skinDark;
    if (y === 16 && x >= 11 && x <= 13) return x === 12 ? JJ.lips : JJ.mouth;
    return JJ.skin;
  }
  if (segDist(px, py, 14.8, 20.5, 15.8, 23.5) < 0.9) return JJ.scarfDark;
  if (ell(px, py, 12, 20.2, 5.6, 1.7)) return JJ.scarf;
  if (px >= 10 && px < 14 && py >= 17 && py < 20) return JJ.skinDark;
  const rx = 8.4, ry = 7.8, side = 2.6;
  const hair = fluffy(px, py, 12, 10.8, rx, ry, 5, 0.05) || fluffy(px, py, 12 - rx + side, 16.6, side, 4.6, 3, 0.06) || fluffy(px, py, 12 + rx - side, 16.6, side, 4.6, 3, 0.06);
  if (hair) {
    if (ell(px, py, 9.4, 5.2, 3.6, 1.4) || ell(px, py, 15.6, 5.6, 1.6, 0.9)) return JJ.hairLight;
    return py > 17.5 || (py > 9.5 && Math.abs(px - 12) > rx - 1.6) ? JJ.hairDark : JJ.hair;
  }
  if (ell(px, py, 12, 26.5, 11, 5.8)) return Math.abs(px - 12) < 2.5 ? JJ.jacketLight : JJ.jacket;
  return null;
};

/** Letters as in FLO_COLOURS. */
const FLO_HEAD = [
  '..kkkk..',
  '.kkkkkk.',
  'kkkkkkkk',
  'kssssssk',
  'srrssrrs',
  'nsessesn',
  'nbssssbn',
  '.bllllb.',
  '.bbmmbb.',
  '..bbbb..',
];

function flo(frame: number): PixelFn {
  const bob = frame === 1 ? 1 : 0, up = frame === 2;
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5, upperY = py - bob;
    const arm = (side: 1 | -1): Px => {
      const [sx, ex, ey, hx, hy] = up ? [5, 6.8, 8.4, 7.3, 2.8] : [5.2, 5.8, 15.8, 6, 19.6];
      const shoulder = [10 + side * sx, 12.8], elbow = [10 + side * ex, ey], hand = [10 + side * hx, hy];
      const wrist = [elbow[0] + (hand[0] - elbow[0]) * 0.45, elbow[1] + (hand[1] - elbow[1]) * 0.45];
      const back = side < 0;
      if (Math.hypot(px - hand[0], upperY - hand[1]) < 1.15 || segDist(px, upperY, wrist[0], wrist[1], hand[0], hand[1]) < 0.95) return back ? FLO.skinDark : FLO.skin;
      if (segDist(px, upperY, shoulder[0], shoulder[1], elbow[0], elbow[1]) < 0.95 || segDist(px, upperY, elbow[0], elbow[1], wrist[0], wrist[1]) < 0.95) return back ? FLO.jacketShade : FLO.jacket;
      return null;
    };
    const a = arm(1) ?? arm(-1);
    if (a !== null) return a;
    const h = FLO_HEAD[Math.floor(upperY) - 1]?.[x - 6];
    if (h && h !== '.') return FLO_COLOURS[h];
    if (px >= 8.6 && px < 11.4 && upperY >= 10 && upperY < 12) return FLO.skinDark;
    const row = Math.floor(upperY), shoulders = row === 11 ? 1 : 0;
    if (upperY >= 11.5 && py < 21.5 && px >= 5 + shoulders && px < 15 - shoulders) {
      if (x === 9 || x === 10) return row === 11 ? FLO.collar : FLO.tee;
      if (row <= 12 && (x === 8 || x === 11)) return FLO.lapel;
      return px < 6.2 || py >= 20.5 ? FLO.jacketShade : FLO.jacket;
    }
    if (py >= 21.5 && py < 29 && px >= 6 && px < 14) return px < 10 ? FLO.jeansDark : FLO.jeans;
    if (py >= 29 && py < 32 && px >= 5.4 && px < 14.6 && !((x === 9 || x === 10) && py < 30)) return Math.floor(py) === 31 ? FLO.sole : FLO.shoe;
    return null;
  };
}

/** The left half, mirrored; FLO_PORTRAIT_EXTRA is what isn't symmetric. Letters as in FLO_COLOURS. */
const FLO_PORTRAIT_LEFT = [
  '............',
  '............',
  '.........kkk',
  '.......kkkkk',
  '......kkkkkk',
  '.....kkskkkk',
  '.....ksssskk',
  '.....kssssss',
  '.....sssssss',
  '....nssrrrss',
  '....nsssssss',
  '....nsssssss',
  '....nbsssssn',
  '.....bbsssnn',
  '.....bbbsbll',
  '.....bbbbbbm',
  '......bbbbbb',
  '.......bbbbb',
  '...J....lbbb',
  '..JjjjjqQcnn',
  '.JjjjjjjqQtt',
  'JjjjjjjjjqQt',
  'JjjjjjjjjqQt',
  'JjjjjjjjjqQt',
];
const FLO_PORTRAIT_EXTRA: [number, number, string][] = [
  [8, 10, 'w'], [9, 10, 'e'], [8, 11, 'w'], [9, 11, 'e'], [14, 10, 'w'], [15, 10, 'e'], [14, 11, 'w'], [15, 11, 'e'],
  [13, 15, 'm'], [14, 14, 'm'],
];
function floPortrait(): string[] {
  const rows = FLO_PORTRAIT_LEFT.map(r => [...r, ...[...r].reverse()]);
  for (const [x, y, c] of FLO_PORTRAIT_EXTRA) rows[y][x] = c;
  return rows.map(r => r.join(''));
}

/** Letters as in CAT_COLOURS. */
const CAT_FRAMES: string[][] = [
  [
    '........................',
    '............D.......D...',
    '............SD.....DS...',
    '............SpS...SpS...',
    '............SpSS1SSpS...',
    '...........LSSS223SSSD..',
    '...........LLwkS3SwkSD..',
    '...........LLkeLLLkeSD..',
    '...........LWWWWpWWWWS..',
    '.........SSSLWWkWkWWS...',
    '.......LLSSSSLLWWWLL....',
    '.....LLSSTSSTSWWWWS.....',
    '....LSSSSTSSTSWWWWD.....',
    '...LSSSSSTSSTSLWWWD.....',
    '...LSSSSSTSSTSSWWSD.....',
    '..LSSSSSSSSSSDSWWSD.....',
    '..LSSSSSSSSSSDSWWSD.....',
    '..LSSSSSSSSSDDSWWSD.....',
    '...DSSSSSSWWDSSWWSD.....',
    '....TTLLTTLLTTLWWWW.....',
  ],
  [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '.............D.......D..',
    '.............SD.....DS..',
    '.............SpS...SpS..',
    '......LLSSSS.SpSS1SSpS..',
    '....LLSTSSTSLSSS223SSSD.',
    '...LSSTSSTSSLLSSS3SSSSD.',
    '...LSSTSSTSSLLkkLLLkkSD.',
    '..LSSSTSSTSSLWWWWpWWWWS.',
    '..LSSSSSSSSSSLWWkWkWWS..',
    '..DSSSSSSSSSSSLLWWWLL...',
    '...TTLLTTLLTTLLWWWW.....',
  ],
  [
    '........................',
    '..tt....................',
    '..rFff..................',
    '.qrfFff.................',
    '..FffFf.................',
    '..qfFffff...............',
    '....fFccf....D.......D..',
    '.....ccccf...SD.....DS..',
    '.......cccf..SpS...SpS..',
    '......LLccfS.SpSS1SSpS..',
    '....LLSTSfTSLSSS223SSSD.',
    '...LSSTSSTSSLLwkS3SwkSD.',
    '...LSSTSSTSSLLkeLLLkeSD.',
    '..LSSSTSSTSSLWWWWpWWWWS.',
    '.TLSSSSSSSSSSLWWkWkWWS..',
    'TT.DSSSSSSSSSSLLWWWLL...',
    '....DSSSSSSSSSWD........',
    '.....SD......SW.DS......',
    '.....WW......SW.DS......',
    '.............WW.WW......',
  ],
  [
    '........................',
    '........................',
    '........................',
    '........................',
    '.....q..................',
    '...q.f..................',
    '..rrFFf......D.......D..',
    '..FfffFcc....SD.....DS..',
    '.tfFffcccc...SpS...SpS..',
    '.tffFfccccfS.SpSS1SSpS..',
    '...ffffcffTSLSSS223SSSD.',
    '...LSSTfSTSSLLwkS3SwkSD.',
    '...LSSTSSTSSLLkeLLLkeSD.',
    '..LSSSTSSTSSLWWWWpWWWWS.',
    '.TLSSSSSSSSSSLWWkWkWWS..',
    'TT.DSSSSSSSSSSLLWWWLL...',
    '....DSSSSSSSSSWD........',
    '.....SD......SW.DS......',
    '.....WW......SW.DS......',
    '.............WW.WW......',
  ],
];
const CAT_PORTRAIT = [
  '........................',
  '...D.................D..',
  '...SD...............DS..',
  '...SpD.............DpS..',
  '...SppS...........SppS..',
  '...LpppSSSSSSSSSSSpppD..',
  '...LSppSTSSS1SSSTSppSD..',
  '...LSSSSTSS223SSTSSSSD..',
  '...LSSSSTSSS3SSSTSSSSD..',
  '...LSSSSSSSSSSSSSSSSSD..',
  '..LSSSSeeSSSSSSSeeSSSSD.',
  '..LSSSewkeSSSSSewkeSSSD.',
  '..LTTSekkeSSSSSekkeSTTD.',
  '..LSSSSeeSWpppWSeeSSSSD.',
  '..LTTSSSWWWWpWWWWSSSTTD.',
  '...LSSSWWWkWkWkWWWSSSD..',
  '....LSSWWWWkWkWWWWSSD...',
  '.....LSSWWWWWWWWWSSD....',
  '......LSWWWWWWWWWSD.....',
  '.....LSSLWWWWWWWLSSD....',
  '....LSTSSLWWWWWLSSTSD...',
  '...LSSTSSSWWWWWSSSTSSD..',
  '..LSSSTSSSWWWWWSSSTSSSD.',
  '..LSSSSTSSSWWWSSSTSSSSD.',
];

export function makeCast(out: Img[]): void {
  sheet(out, 'char.jj', JJ_POSES.map((_, i) => jjStand(i)), OUTLINE);
  sheet(out, 'char.flo', [flo(0), flo(1), flo(2)], OUTLINE);
  image(out, 'portrait.jj', 24, 24, jjPortrait, OUTLINE);
  asciiImage(out, 'portrait.flo', floPortrait(), FLO_COLOURS, OUTLINE);
  sheet(out, 'char.cat', CAT_FRAMES.map(rows => ascii(rows, CAT_COLOURS)), OUTLINE);
  asciiImage(out, 'portrait.cat', CAT_PORTRAIT, CAT_COLOURS, OUTLINE);
}
