// Checks every level (src/levels.ts) and its blocks.
// Run: npm run check:blocks
import { BIRD_BOX, DASH, GAME_H, GRAVITY as G, GROUND_Y, PICKUP_GRACE, TILE, PLAYER as P } from '../src/constants.ts';
import { EN } from '../src/texts/en.ts';
import { LEVELS, type LevelDef } from '../src/levels.ts';
import { DASH_PIT_LEAD, DASH_PIT_ROW, MAX_PIT, SYMBOLS, type Block, type SymbolRule, blockWidth, bottomRow, dashPits, isBlockSymbol, pits } from '../src/track/symbols.ts';
import { ITEMS, type ItemId } from '../src/items.ts';

const DT = 1 / 60, HALF_W = BIRD_BOX.w / 2, BODY_H = BIRD_BOX.h;
const HUD_H = 20;
const LEAD = 64;
const HOLDS = [1, 4, 8, 12, 16, 24, Infinity];             // frames the jump button is held
/** [first jump's hold, frames after takeoff, second jump's hold] */
const DOUBLES: [number, number, number][] = [];
for (const h1 of [4, 12, Infinity]) for (const at of [8, 14, 20, 26, 34, 44]) for (const h2 of [1, 8, 16, Infinity]) DOUBLES.push([h1, at, h2]);

/** columns */
const DASH_APART = Math.ceil((DASH.speed * DASH.ms / 1000 + P.runSpeed * (DASH.cooldownMs - DASH.ms) / 1000 + 2 * TILE) / TILE);

interface Surface { id: number; top: number; x0: number; x1: number }
interface Pickup { kind: ItemId; x: number; y: number; row: number; col: number; needsJump: boolean }

const rule = (ch: string): SymbolRule | undefined => (isBlockSymbol(ch) ? SYMBOLS[ch] : undefined);

function parse(block: Block) {
  const w = blockWidth(block) * TILE;
  const surfaces: Surface[] = [];
  let groundFrom = -Infinity;
  for (const [from, len] of pits(block)) {
    surfaces.push({ id: surfaces.length, top: GROUND_Y, x0: groundFrom, x1: from * TILE });
    groundFrom = (from + len) * TILE;
  }
  surfaces.push({ id: surfaces.length, top: GROUND_Y, x0: groundFrom, x1: Infinity });
  const pickups: Pickup[] = [];
  block.rows.forEach((line, i) => {
    const row = block.rows.length - i, top = GROUND_Y - row * TILE;
    for (let c = 0; c < line.length; c++) {
      const r = rule(line[c]);
      if (r?.pickup) pickups.push({ kind: r.pickup, x: c * TILE + TILE / 2, y: top + TILE / 2, row, col: c, needsJump: !!r.needsJump });
      if (r?.platform) {
        let e = c;
        while (line[e + 1] === line[c]) e++;
        surfaces.push({ id: surfaces.length, top, x0: c * TILE, x1: (e + 1) * TILE });
        c = e;
      }
    }
  });
  return { w, surfaces, pickups };
}

function check(block: Block) {
  const { w, surfaces, pickups } = parse(block);
  const got = new Set<number>();
  const touch = (into: Set<number>, x: number, feet: number) => {
    const cy = feet - BODY_H / 2;
    pickups.forEach((f, i) => {
      if (Math.abs(f.x - x) <= HALF_W + PICKUP_GRACE.x && Math.abs(f.y - cy) <= BODY_H / 2 + PICKUP_GRACE.y) into.add(i);
    });
  };
  const onTop = (s: Surface, x: number) => x + HALF_W > s.x0 && x - HALF_W < s.x1;
  const vx = P.runSpeed * DT;

  // hold = frames the button stays down (Infinity = glide all the way); glide = held since before an edge it
  // walked off; dj = [frame, hold]: the double jump's press, and its hold
  const fly = (x: number, feet: number, vy: number, hold: number, glide = false, dj?: [number, number]): [number, number] | null => {
    const touched = new Set<number>(), keep = () => touched.forEach(i => got.add(i));
    let from = 0;
    for (let f = 0; f < 600; f++) {
      if (dj && f === dj[0]) { vy = P.airJumpVel; hold = dj[1]; from = f; glide = false; }
      const held = glide || f - from < hold;
      if (!glide && hold < Infinity && f - from >= hold && vy < P.jumpCutVel) vy = P.jumpCutVel;
      vy = Math.min(vy + G * DT, P.maxFall);
      if (held && vy > 0) vy = Math.min(vy, P.glideFallCap);
      const prev = feet;
      feet += vy * DT; x += vx;
      touch(touched, x, feet);
      if (vy >= 0) {
        const land = surfaces.find(s => prev <= s.top && feet >= s.top && onTop(s, x));
        if (land) { keep(); return [land.id, x]; }
      }
      // under the ground line it's in a pit: what it touched counts only if it gets out
      if (feet - BODY_H > GAME_H) return null;
      if (x > w + LEAD && feet <= GROUND_Y) { keep(); return null; }
    }
    return null;
  };

  const scannedFrom = new Map<number, number>();
  const queue: [number, number][] = [[0, -LEAD]];
  while (queue.length) {
    const [sid, x0] = queue.shift()!;
    const until = scannedFrom.get(sid) ?? Infinity;
    if (x0 >= until - 1) continue;
    scannedFrom.set(sid, x0);
    const s = surfaces[sid];
    for (let x = x0; x < Math.min(w + LEAD, until); x += vx) {
      if (!onTop(s, x)) {
        for (const glide of [false, true]) {
          const r = fly(x, s.top, 0, 0, glide);
          if (r) queue.push(r);
        }
        for (const at of [8, 16, 24]) for (const h2 of [1, 16, Infinity]) {
          const r = fly(x, s.top, 0, 0, false, [at, h2]);
          if (r) queue.push(r);
        }
        break;
      }
      touch(got, x, s.top);
      for (const hold of HOLDS) {
        const r = fly(x, s.top, P.jumpVel, hold);
        if (r && r[0] !== sid) queue.push(r);
      }
      for (const [h1, at, h2] of DOUBLES) {
        const r = fly(x, s.top, P.jumpVel, h1, false, [at, h2]);
        if (r && r[0] !== sid) queue.push(r);
      }
    }
  }

  const missed = pickups.filter((_, i) => !got.has(i));
  const high = pickups.filter(f => f.y - TILE / 2 < HUD_H);
  const grounded = pickups.filter(f => f.needsJump && Math.abs(f.y - (GROUND_Y - BODY_H / 2)) <= BODY_H / 2 + PICKUP_GRACE.y);
  return { kinds: [...new Set(pickups.map(f => f.kind))], total: pickups.length, missed, high, grounded };
}

function structure(block: Block, placedGoal: ItemId | undefined, maxPit: number): string[] {
  const problems: string[] = [];
  const bottom = bottomRow(block), w = blockWidth(block);
  block.rows.forEach((line, i) => {
    const row = block.rows.length - i;
    [...line].forEach((ch, col) => {
      const r = rule(ch);
      if (!r) { problems.push(`unknown symbol '${ch}' at col ${col}, row ${row}`); return; }
      const name = `'${ch}' (${r.what.split(':')[0]}) at col ${col}`;
      if (r.rows && (row < r.rows[0] || row > r.rows[1])) {
        const [lo, hi] = r.rows;
        problems.push(`${name} in row ${row}: it goes in ${lo === hi ? `row ${lo}` : hi === Infinity ? `row ${lo} or higher` : `rows ${lo}-${hi}`}`);
      }
      if (r.pickup && r.pickup !== placedGoal) problems.push(`${name}, row ${row}: this level's blocks don't place ${r.pickup}s`);
      if (r.onGround && bottom[col] === '_') problems.push(`${name}, row ${row}: it stands on the ground, but there's a pit below`);
    });
  });
  for (const [from, len] of pits(block)) {
    if (len > maxPit) problems.push(`pit at cols ${from}-${from + len - 1} is ${len} wide (max ${maxPit})`);
    if (from < 2 || from + len > w - 2) problems.push(`pit at cols ${from}-${from + len - 1} touches the block's first or last 2 columns`);
  }
  const low = block.rows[block.rows.length - DASH_PIT_ROW] ?? '';
  for (const [from, len] of dashPits(block)) {
    if (len > MAX_PIT.low) problems.push(`dash pit at cols ${from}-${from + len - 1} is ${len} wide (max ${MAX_PIT.low})`);
    const cover = `the overhang in row ${DASH_PIT_ROW} must cover it and the ${DASH_PIT_LEAD} columns before it`;
    if (from < DASH_PIT_LEAD) problems.push(`dash pit at cols ${from}-${from + len - 1} starts before col ${DASH_PIT_LEAD}: ${cover}, inside the block`);
    else if (!/^~+$/.test(low.slice(from - DASH_PIT_LEAD, from + len)) || low.length < from + len) problems.push(`dash pit at cols ${from}-${from + len - 1}: ${cover}`);
  }
  return problems;
}

const levelBlocks = (def: LevelDef): Block[] => (def.intro ? [def.intro, ...def.blocks] : def.blocks);

function dashSpacing(def: LevelDef): string[] {
  const need = (approach: number) => DASH_APART + Math.ceil((approach * DASH.cooldownMs) / 1000 / TILE);
  const blocks = levelBlocks(def).map(block => {
    const found = new Map<number, number>();
    block.rows.forEach(r => [...r].forEach((ch, c) => {
      const s = rule(ch);
      if (s?.dashOnly) found.set(c, Math.max(found.get(c) ?? 0, need(s.approach ?? 0)));
    }));
    for (const [c] of dashPits(block)) found.set(c, Math.max(found.get(c) ?? 0, need(0)));
    return { block, obstacles: [...found].sort(([x], [y]) => x - y), w: blockWidth(block) };
  }).filter(x => x.obstacles.length);
  const problems: string[] = [];
  for (const { block, obstacles } of blocks) {
    for (let i = 1; i < obstacles.length; i++) {
      const [[c0], [c1, room]] = [obstacles[i - 1], obstacles[i]];
      if (c1 - c0 < room) problems.push(`${block.name}: dash-only obstacles at cols ${c0} and ${c1} are ${c1 - c0} apart (the dash needs ${room})`);
    }
  }
  for (const a of blocks) {
    for (const b of blocks) {
      if (a === b || b.block === def.intro) continue;
      const [[first, room]] = b.obstacles, apart = a.w - a.obstacles[a.obstacles.length - 1][0] + first;
      if (apart < room) problems.push(`${a.block.name} -> ${b.block.name}: dash-only obstacles can be ${apart} cols apart (the dash needs ${room})`);
    }
  }
  return problems;
}

let bad = 0;
for (const [id, def] of Object.entries(LEVELS)) {
  console.log(`- ${id} ${EN[def.name]}`);
  const placedGoal = def.goal && !ITEMS[def.goal.item].carried ? def.goal.item : undefined;
  const maxPit = def.verbs.dash ? MAX_PIT.dash : MAX_PIT.jump;
  for (const block of levelBlocks(def)) {
    const problems = structure(block, placedGoal, maxPit);
    let line = `${block.name.padEnd(14)} tier ${block.tier}`;
    const { kinds, total, missed, high, grounded } = check(block);
    if (total) line += `  ${String(total).padStart(2)} ${kinds.map(k => EN[total === 1 ? ITEMS[k].one : ITEMS[k].many]).join(', ')}`;
    const status = problems.length ? 'BAD SYMBOLS' : missed.length ? 'UNREACHABLE' : grounded.length ? 'ON THE GROUND' : 'ok';
    console.log(`${line}  ${status}`);
    for (const p of problems) console.log(`   ✗ ${p}`);
    for (const f of missed) console.log(`   ✗ ${f.kind} at col ${f.col}, row ${f.row} can't be reached`);
    for (const f of grounded) console.log(`   ✗ ${f.kind} at col ${f.col}, row ${f.row} can be collected without jumping`);
    for (const f of high) console.log(`   ! ${f.kind} at col ${f.col}, row ${f.row} sits under the HUD`);
    bad += problems.length + missed.length + grounded.length;
  }
  for (const p of dashSpacing(def)) { console.log(`   ✗ ${p}`); bad++; }
  if (!def.goal === !def.bosses) {
    console.log(`   ✗ a level needs a goal item or bosses (one of them)`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
