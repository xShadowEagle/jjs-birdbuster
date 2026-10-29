# Levels

Each level is an endless track of hand-made **blocks** for its biome: a fixed intro block, then the rest tier by tier, each tier shuffled, then all of them mixed (every block once before any repeats). It clears when its goal is reached, a count of its own item. Difficulty ramps by combining earlier obstacles.

| # | Biome                 | Teaches                  | New obstacles               | Enemies                        | Hearts | Goal                                         |
|---|-----------------------|--------------------------|-----------------------------|--------------------------------|--------|----------------------------------------------|
| 1 | Meadow                | jump, double jump, glide | one-way platforms; feathers | none                           | none   | 20 feathers                                  |
| 2 | Woods                 | slide                    | low branches                | Rogues                         | 3      | 10 berries; 1 bush in 3 bears one            |
| 3 | Swamp                 | peck                     | pits                        | Kaktus; Rogues                 | 3      | 10 fireflies, every second Kaktu carries one |
| 4 | Jungle                | cleave                   | webs, pits                  | Archids; big Kaktus, Rogues    | 3      | 10 coconuts, every second Archid carries one |
| 5 | Tower                 | sword dash               | walls, pits, low halls      | Fae; Rogues, Kaktus, an Archid | 3      | 3 keys, one Fae in 4 carries one             |
| - | The Nest (boss stage) | -                        | -                           | the three rival birds          | 3      | none: beating the last clears it             |

The numbers are in `LEVELS` (`src/levels.ts`), the enemies in `src/entities/enemies/`, their symbols' rules in `SYMBOLS`.

## Blocks
- ASCII in `src/track/<biome>.ts`; adding one: docs/recipes.md, section Block.
- Every block starts and ends on flat ground, so any block can follow any other.
- A run's first web and first wall get a hint: on it, a little above the bird's head height, a blinking icon of the move that breaks it (`Level.hintFirst`).
- `tier`: the track plays all of a level's tier 1 blocks (shuffled), then its tier 2, then its tier 3, then everything mixed. So a short level ramps up without repeating its easy blocks, and the goal should come up around the last tier: tune a level's item count against that. A level's enemy comes in its base form in tier 1, its variants from tier 2 on; earlier levels' enemies are mixed in.
- A glide carries far (a jump and glide about 16 tiles), so no open pit can need the dash. A dash pit has a low overhang over it (`~` in row 3, from 3 columns before it): no jump gets over, only a dash from the edge (`MAX_PIT.low`).
- A Fae floats toward the bird, so the dash needs more room before one (31 columns after a wall or a dash pit, not 24): Fae sit 19+ columns into their blocks (check-blocks counts `approach`).
- Each level has an intro block and 9 to 17 more (the Tower the most); the boss stage a plain floor (`NEST`).

## Boss Stage (The Nest)
The three rivals one after another (`BossFight`), each a `Boss` (`src/entities/enemies/Boss.ts`) twice the bird's size: it hovers ahead, blinks white, then swoops at head height (slide under it), with moves of its own on top. Beaten, a boss tumbles off; once the last one has, the stage is cleared (no goal item: the boss bar shows the progress).
- **Grey** (`Grey.ts`, 3 hits): movement. Only open to a hit while stuck after a pound.
- **Teal** (`Teal.ts`, 4 hits): attacks. Only her own feathers, cleaved back, hurt her; her volleys ramp by hits taken (`VOLLEYS`).
- **Lime** (`Lime.ts`, 5 hp): the dash, in three parts, which the dev sidebar starts each of (Lime-P1, -P2, -P3). P2 hands the bird the rainbow powers (`Rainbow`), and in P3 only those hurt her.
