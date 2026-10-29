import Phaser from 'phaser';
import { DROP_BEHIND, DEPTH, GAME_W, GAME_H, GROUND_Y, SLIDE_HEADROOM, TILE } from '../constants';
import { groundStrip } from '../world/ground';
import type { Biome } from '../world/biomes';
import type Pickups from '../entities/Pickups';
import { isEnemySymbol, type EnemySymbol } from '../entities/Enemies';
import type Enemies from '../entities/Enemies';
import { overlaps, type Box } from '../geom';
import { ITEMS } from '../items';
import { SYMBOLS, blockWidth, bottomRow, isBlockSymbol, type Block, type BlockSymbol, type PickupSymbol, type SymbolRule } from './symbols';

interface Placed { endX: number; objects: Phaser.GameObjects.GameObject[]; hazardCount: number; spanCount: number }
interface Span { x0: number; x1: number }

type TrackSymbol = Exclude<BlockSymbol, EnemySymbol | PickupSymbol>;

const BRANCH_INSET_X = 3, BRANCH_INSET_Y = 2;

const AHEAD = GAME_W;
const SAFE_IN = 12;
const PLANT_BAG = 6;

export default class Track {
  readonly ground: Phaser.Physics.Arcade.StaticGroup;
  readonly platforms: Phaser.Physics.Arcade.StaticGroup;
  private readonly hazards: Box[] = [];
  private readonly spans: Span[] = [];

  private readonly placed: Placed[] = [];
  private bag: Block[] = [];
  private nextX = 0;
  private tier = 0;
  private prev: Block | null = null;
  private bearing: boolean[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly biome: Biome, private readonly blocks: Block[],
    private readonly things: { pickups: Pickups; enemies: Enemies }, intro?: Block) {
    if (!blocks.some(b => b.tier <= 1)) throw new Error('Track needs at least one tier-1 block');
    this.ground = scene.physics.add.staticGroup();
    this.platforms = scene.physics.add.staticGroup();
    if (intro) this.place(intro, true);
  }

  update(camLeft: number): void {
    while (this.nextX < camLeft + GAME_W + AHEAD) this.place(this.nextBlock());
    while (this.placed.length && this.placed[0].endX < camLeft - DROP_BEHIND) {
      const gone = this.placed.shift()!;
      for (const o of gone.objects) o.destroy();
      // both lists are in the order blocks were placed: the oldest block's come first
      this.hazards.splice(0, gone.hazardCount);
      this.spans.splice(0, gone.spanCount);
    }
  }

  get layout(): { ground: readonly Span[]; hazards: readonly Box[] } {
    return { ground: this.spans, hazards: this.hazards };
  }

  respawnX(x: number): number {
    const span = this.spans.find(s => s.x1 > x + TILE);
    return span ? Math.max(x, span.x0 + SAFE_IN) : x;
  }

  hurts(box: Box): boolean {
    return this.hazards.some(h => overlaps(h, box));
  }

  private nextBlock(): Block {
    if (this.bag.length === 0) {
      const above = this.blocks.filter(b => b.tier > this.tier);
      if (above.length) this.tier = Math.min(...above.map(b => b.tier));
      this.bag = Phaser.Utils.Array.Shuffle(above.length ? this.blocks.filter(b => b.tier === this.tier) : [...this.blocks]);
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.prev) this.bag.unshift(this.bag.pop()!);
    }
    return (this.prev = this.bag.pop()!);
  }

  private bears(share: number): boolean {
    if (!this.bearing.length) this.bearing = Phaser.Utils.Array.Shuffle(Array.from({ length: PLANT_BAG }, (_, i) => i < Math.round(share * PLANT_BAG)));
    return this.bearing.pop()!;
  }

  private place(block: Block, intro = false): void {
    const x0 = this.nextX, hazards0 = this.hazards.length, spans0 = this.spans.length;
    const objects = [...this.layGround(block, x0), ...this.placeSymbols(block, x0, intro)];
    this.nextX = x0 + blockWidth(block) * TILE;
    this.placed.push({ endX: this.nextX, objects, hazardCount: this.hazards.length - hazards0, spanCount: this.spans.length - spans0 });
  }

  private layGround(block: Block, x0: number): Phaser.GameObjects.GameObject[] {
    const s = this.scene, biome = this.biome, w = blockWidth(block);
    const gtex = s.textures.get(biome.ground).getSourceImage(), over = biome.groundOverhang ?? 0;
    const bottom = bottomRow(block);
    const strips: Phaser.GameObjects.GameObject[] = [];
    for (let c = 0; c < w; c++) {
      if (bottom[c] === '_') continue;
      let e = c;
      while (e + 1 < w && bottom[e + 1] !== '_') e++;
      const gx = x0 + c * TILE, gw = (e - c + 1) * TILE;
      const ground = groundStrip(s, biome, gx, gw).setDepth(DEPTH.ground);
      ground.tilePositionX = gx % gtex.width;
      this.ground.add(ground);
      (ground.body as Phaser.Physics.Arcade.StaticBody).setSize(gw, gtex.height - over, false).setOffset(0, over);
      strips.push(ground);
      this.spans.push({ x0: gx, x1: gx + gw });
      c = e;
    }
    return strips;
  }

  private placeSymbols(block: Block, x0: number, intro: boolean): Phaser.GameObjects.GameObject[] {
    const s = this.scene, biome = this.biome;
    const objects: Phaser.GameObjects.GameObject[] = [];
    const plankH = s.textures.get(biome.plank).getSourceImage().height;

    block.rows.forEach((line, i) => {
      const row = block.rows.length - i;            // 1 = just above the ground
      const top = GROUND_Y - row * TILE;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c], x = x0 + c * TILE;
        if (!isBlockSymbol(ch)) throw new Error(`Block "${block.name}" has an unknown symbol '${ch}' (track/symbols.ts)`);
        const rule: SymbolRule = SYMBOLS[ch];
        if (isEnemySymbol(ch)) { this.things.enemies.spawn(ch, x + TILE / 2, top + TILE / 2); continue; }
        if (rule.pickup) {
          const { plant, bearing = 1 } = ITEMS[rule.pickup];
          if (plant) objects.push(s.add.image(x + TILE / 2, GROUND_Y + 1, plant).setOrigin(0.5, 1).setDepth(DEPTH.decor));
          if (!plant || intro || this.bears(bearing)) this.things.pickups.place(rule.pickup, x + TILE / 2, top + TILE / 2);
          continue;
        }
        const sym = ch as TrackSymbol;
        switch (sym) {
          case '.':
          case '_':
            break;
          case '=': {
            let end = c;
            while (line[end + 1] === '=') end++;
            const plank = s.add.tileSprite(x, top, (end - c + 1) * TILE, plankH, biome.plank).setOrigin(0).setDepth(DEPTH.plank);
            this.platforms.add(plank);
            const b = plank.body as Phaser.Physics.Arcade.StaticBody;
            b.checkCollision.down = b.checkCollision.left = b.checkCollision.right = false;
            objects.push(plank);
            c = end;
            break;
          }
          case '~':
            if (!biome.lowBranch) throw new Error(`Block "${block.name}" has a low branch, but the biome has no lowBranch art`);
            objects.push(...this.hangBranch(x, top + TILE, biome.lowBranch));
            break;
          case 'f':
          case 'b': {
            const set = sym === 'b' ? biome.decor.large : biome.decor.small;
            const key = set[(x / TILE) % set.length];
            objects.push(s.add.image(x + TILE / 2, GROUND_Y + 1, key).setOrigin(0.5, 1).setDepth(DEPTH.decor));
            break;
          }
          default: {
            const unplaced: never = sym;
            throw new Error(`Track can't place '${String(unplaced)}'`);
          }
        }
      }
    });
    return objects;
  }

  private hangBranch(x: number, rowBottom: number, art: NonNullable<Biome['lowBranch']>): Phaser.GameObjects.GameObject[] {
    const s = this.scene, leaves = rowBottom - (SLIDE_HEADROOM - TILE), cx = x + TILE / 2;
    const artW = s.textures.get(art.tile).getSourceImage().width;
    const parts: Phaser.GameObjects.GameObject[] = [s.add.image(cx, leaves, art.end).setOrigin(0.5, 1).setDepth(DEPTH.branch)];
    if (leaves - TILE > 0) parts.push(s.add.tileSprite(Math.round(cx - artW / 2), 0, artW, leaves - TILE, art.tile).setOrigin(0).setDepth(DEPTH.branch));
    this.hazards.push({ x: x + BRANCH_INSET_X, y: -GAME_H, w: TILE - BRANCH_INSET_X * 2, h: rowBottom - BRANCH_INSET_Y + GAME_H });
    return parts;
  }
}
