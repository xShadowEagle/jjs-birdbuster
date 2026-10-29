# Assets

What art and sound the game has, and where it comes from. Every image is a PNG in `public/assets/`, listed in `src/assets/manifest.ts`. The biome backdrops, some tiles and props, and the music come from CC0 packs (credits below); the rest is ours, painted by the generators in `tools/art/` (docs/recipes.md, section Art).

## Sprites
| Sprites                                           | Generator (`tools/art/`) |
|---------------------------------------------------|--------------------------|
| the bird and its riders, the rivals, the bosses   | `bird.ts`                |
| the cast on foot                                  | `cast.ts`                |
| portraits                                         | `bird.ts`, `cast.ts`     |
| the enemies and what they throw or carry          | `enemies.ts`             |
| props and emotes                                  | `props.ts`               |
| items, effects, hearts and the rest of the UI     | `sprites.ts`             |
| the touch buttons' icons                          | `buttons.ts`             |
| the biomes' own pieces, the bosses' floor effects | `biomes.ts`              |
| the page's pictures                               | `page.ts`                |

- The bosses are the rivals drawn at twice the size (80x80, a 1 px outline like everything else), not their 40 px sheets doubled: the generator's shapes are in 40 px units and render at any size.
- The bird's slide frames stay under `SLIDE_HEADROOM` (baking fails otherwise).

## Biomes
| Biome  | Backdrop layers (far to near)          | Ground               | Plank          | Decor                                  |
|--------|----------------------------------------|----------------------|----------------|----------------------------------------|
| meadow | Sunny Land Woods                       | ours                 | ours           | ours                                   |
| woods  | Sunny Land Forest                      | Forest tileset       | Forest tileset | Forest props                           |
| swamp  | Forest of Illusion                     | ours                 | ours           | ours                                   |
| jungle | Tall Forest                            | ours                 | ours           | ours                                   |
| tower  | Fort of Illusion                       | ours                 | ours           | ours, the banner from the Fort's props |
| nest   | the Tower's, moved down, under our sky | the Tower's          | the Tower's    | the Tower's                            |
| sunset | the Meadow's recoloured, under our sky | the Meadow's, dimmed | the Meadow's   | the Meadow's                           |

The packs' layers are used as shipped, except the Nest's and the sunset's (`biomes.ts`). Our grounds are 64 px wide and tile seamlessly (the swamp's and jungle's overhang the walkable line); our pieces use palettes sampled from the matching pack, in `biomes.ts`.

## Audio
- Sound effects: synthesized in `src/audio/sfx.ts`.
- Music: `music/<track>.ogg` + `.mp3` (for Safari), about 96 kbps, each normalised to -16 LUFS with plain gain. The tracks are `MUSIC` in the manifest; which plays where, `src/story/music.ts`.

## Credits
Third-party work is credited in three places: the Credits scene (`src/credits.ts`), `public/licenses.txt` and here (docs/recipes.md, section Credits).

From Ansimuz's (Luis Zuno) pixel-art packs, all CC0 (public domain; credit not required, given gladly), at ansimuz.itch.io:
- Sunny Land Woods: the Meadow's backdrop
- Sunny Land Forest: the Woods' backdrop, ground, plank and decor
- Forest of Illusion: the Swamp's backdrop
- Tall Forest: the Jungle's backdrop
- Fort of Illusion: the Tower's backdrop and banner, and the pieces of its gate in the cutscenes (`gate.png`, `doorway.png`)
- SunnyLand Music: the music, re-encoded with dash-case names (12 of the pack's 17 tracks)

Everything else is ours. The game is built with Phaser (MIT licence, in `licenses.txt`, with what it bundles: eventemitter3, Matter.js, psrdnoise and parts by RoboWhale and CodeAndWeb, all MIT, Earcut (ISC) and Simplify.js (BSD 2-clause), each with its notice there).
