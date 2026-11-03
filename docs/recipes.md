# Recipes: Extending

Step-by-step for the usual additions; how the parts work: docs/stack.md. The typechecker, `npm run check` and the play-tests (docs/stack.md, section Testing) catch most of what a step forgets.

## Level
1. Blocks in `src/track/<biome>.ts`: an optional intro block and a list (`Block[]`, typed in `src/track/symbols.ts`). The format is at the top of `meadow.ts`.
2. An entry in `LEVELS` (`src/levels.ts`): name (a text key, `level.<id>`), biome, music, goal (item and count), hearts (`lives`), unlocked moves (`verbs`), the move it introduces (`teach`), the intro and the blocks, optionally `bosses`.
3. A step in `FLOW` (`src/story/flow.ts`), usually after a cutscene that introduces it.

The dev sidebar and the play-tests reach a level through its `FLOW` step. The bot only knows the moves and enemies there are now.

## Block
Add a `Block` to the level's list with a `tier` (docs/levels.md). Start and end it on flat ground, and keep walls, Fae and dash pits 12+ columns from its ends (a Fae, coming toward the bird, 19+): the dash's cooldown carries over into the next block. The format and how far the bird reaches: the top of `src/track/meadow.ts`; the symbols: `src/track/symbols.ts`. `npm run check:blocks` checks the rest (rows, pits, spacing, every item in reach) and says what's wrong.

## Block Symbol
1. Its rule in `SYMBOLS` (`src/track/symbols.ts`): what it places, its rows, its item (`pickup`, `needsJump`), whether it stands on the ground (`onGround`), whether only the dash gets past it.
2. Something to place it: the rule's `pickup`, an enemy in `ENEMY_SYMBOLS` (`src/entities/Enemies.ts`), or a case in `Track.placeSymbols()`. The typecheck fails until one of them does.
3. If it brings something new to a level, its line in docs/levels.md.

## Enemy
1. A class in `src/entities/enemies/` that extends `Enemy`:
   - its hitbox (`boxW`, `boxH`, or override `box`), `hp`, and `weakTo` (the attacks that hurt it);
   - `move(dt, arena)`: its scripted path. Something it throws is an enemy too, added with `arena.add()` (the Rogue's knife).
   - optional: `carry()` the level's item when the arena hands it one (`goal.oneIn`); `meets` for how it takes an attack (hurt, clang off, let it pass), `harmless`; `defeatTween()`, `dropLoot()` and `leave()` for its defeat.

   Something meant to be slid under passes over a sliding bird's box with a gap (`swoopY(boxH, gap)`) its sprite also clears (`SLIDE_HEADROOM`). Variants of one behaviour: a kind table with a subclass each, like the Kaktu's or `Barrier`'s `Web`/`Wall`.
2. Its symbol (above).
3. Its art: a sheet `enemy.<name>` in `SHEETS`, its animations in `ANIMS` (`src/assets/manifest.ts`). Try drafts on the workbench first.
4. Teach the play-test bot (`autopilot` in `src/dev/playtest.ts`) a new trick if it needs one.

## Boss
A `BossSpec` in the level's `bosses` (which rival, hp, swoop speed, hover time), fought one after another (`BossFight`).
- A new rival: an entry in `RIVALS` (`src/rivals.ts`: name, name-tag colour, voice) and its plumage in `PLUMAGE` (`tools/art/palette.ts`), then `npm run bake:art`. Its sheet, portrait, animations and speaking character follow from the list.
- Its moves: a class extending `Boss.ts`: its phases in `act`, what it does after hovering in `nextMove`, after a swoop in `afterSwoop`, the button that hurts it while it's open in `openTo` (the touch hint); picked by rival in `makeBoss` (`src/entities/enemies/bosses.ts`), like `Grey.ts`, `Teal.ts`, `Lime.ts`.
- Its sounds and effects: events it emits, played in `bossFeedback` (`src/entities/feedback.ts`).
- The workbench lists its moves from `BOSS_MOVES` (`workbench/foes.ts`), and the play-test bot needs to know them (`src/dev/playtest.ts`).

## Biome
1. PNGs in `public/assets/world/<id>/`: parallax layers, ground, plank, decor, optionally the low branch and a ceiling.
2. Manifest entries (`IMAGES`, keys `world.<id>.<name>`).
3. A `BIOMES` entry (`src/world/biomes.ts`).
4. Use it as a level's `biome` or a cutscene's `stage`.

## Item
1. A PNG in `public/assets/items/`, manifest key `item.<name>`, and an `ITEMS` entry (`src/items.ts`) with its HUD words (`item.<name>.one` / `.many`). A set of pieces collected in order (the keys) lists one image per piece.
2. Where it comes from: `carried` by the level's enemies (`goal.oneIn`: only some), or placed by a block symbol (its rule's `pickup`), optionally growing on a `plant` (the berry's bush).
3. Make it a level's `goal.item`, with a reason in the cutscene before it.

## Cutscene
1. A script in `src/story/cutscenes/` (types: `src/story/cutscene.ts`): a stage, actors, beats; shared pieces in `beats.ts`. To look at a moment: `playtest.cutscene(id, stop)`, then a screenshot.
2. Register it in `CUTSCENES` (`cutscenes/index.ts`) and add a step in `FLOW`.
3. A new character: `src/story/characters.ts` (`name.<id>`) plus a portrait. If its head isn't at the sprite's top centre (or two share a sprite, like JJ on the bird), add it to `HEADS`.
4. A new kind of beat: the `Beat` union and `Cutscene.play()`.

## Move
No single table:
- `Verbs` and the button (`ButtonId`, `TOUCH` in `src/constants.ts`, its keys in `BINDINGS` and their name `key.<id>`, its icon `ui.icon_<id>`, drawn in `tools/art/buttons.ts`; the attack button's follows the swing: `iconOf` in `src/ui/touch.ts`);
- what it does in `Player.step()`, and its tuning constants;
- the levels' `verbs` and `teach`;
- if it hits things, an `Attack` and its hitbox (`Enemies.strikes`);
- its row in `HUD.moves()` and its start-screen line (`hud.help.<id>`);
- sound and effects (`birdFeedback` in `src/entities/feedback.ts`, `sfx`, `Fx`).

## Art
The art is baked from generators in `tools/art/` (helpers in `tools/art/lib/`; `bake:art`'s options at the top of `bake.ts`). A change goes in rounds:
1. **Drafts:** about three variants in `workbench/drafts/<set>/<its path under public/assets>`: from a scratch generator, or `npm run bake:art -- --out workbench/drafts/<set> <path>` after changing a generator.
2. **Look:** on the workbench, and close up: `npm run art:sheet -- <files>` writes them scaled up side by side to `tmp/sheet.png` (`path#n`: a sheet's frame n; `--row`: a new row). Where it matters, in context too. An effect made in code gets a workbench view instead (an entry in `VIEWS`, `workbench/panel.ts`).
3. **Pick:** then variants of the favourite until one is right.
4. **Build it in:** its generator replaces the old one; `npm run bake:art -- --force <path>`; `npm run art:same -- <set>` must say "same" for every file. Look at it in the game and update docs/assets.md.

- **By hand:** draw it as a draft, then copy it over the file in `public/assets/`, same size and layout (and drop its generator, or never `--force` it).
- **A new image:** the PNG plus a manifest entry (`IMAGES`, or `SHEETS` with the frame size and `ANIMS`), named `<group>.<name>` after its folder. `npm run check:assets` reports missing, unlisted or mis-sized files.
- **The page's pictures** (`tools/art/page.ts`) are made from the bird, the feather, the Meadow and the text `loading`: after changing one of those, `npm run bake:art -- --force page`.

## Texts & Languages
In a speech bubble, words between `~`s are struck through; a translation marks its own.
- **A new text:** a key in `src/texts/en.ts` in its group, `'TODO'` in `de.ts`, then the key where it's used: `t('pause.title')`, `t('hud.boss', { n, of })` in code, the key itself in data (`{ say: 'jj', text: 'intro.boyfriend' }`). A whole phrase per key, so a translation can order it its own way. Write keys out in full (no `` `level.${id}` ``): the check looks for them.
- **A line said during a level** (a `SayEvent`): its key and speaker in `RUN_LINES` (`src/story/characters.ts`), so the HUD knows who says it and the check measures it against its bubble.
- **Translating:** in the workbench's Texts view, or by hand (`npm run check:texts -- --missing de` lists the TODOs; `-- --all` every text). Keep the `{placeholders}` and the pixel font's characters. A spoken line fits its bubble in 2 lines (`BUBBLE.maxLines`): shorten it, or split it into two `say` beats.
- **A new language:** a file like de.ts, an entry in `LANGUAGES` and `TEXTS` (`src/language.ts`), maybe letters for the font (`src/ui/font.ts`); `ready: true` once it's complete (then `check:texts` allows no TODOs in it).

## Credits
Third-party art, music or a runtime dependency: `src/credits.ts` (the Credits scene; the font has no copyright sign or &), `public/licenses.txt` (shipped as is) and docs/assets.md, section Credits, all three.

## Music & Sound
- **Music:** `public/assets/music/<track>.ogg` plus an `.mp3`, normalised to -16 LUFS, a key in `MUSIC`, used as a level's or cutscene's `music` (a boss stage's `rainbowMusic` takes over at the cat's gift). To level a track: `ffmpeg -i in.ogg -af loudnorm=print_format=json -f null -` gives its loudness (`input_i`); the gain is -16 minus that, `-af volume=<gain>dB`, encoded with `-c:a libvorbis -b:a 96k` and `-c:a libmp3lame -b:a 96k`.
- **Sound effects:** an entry in `TONES` (`src/audio/sfx.ts`), played by `sfx.<name>()`; cutscenes can play the ones without arguments (`sound` beats). The workbench's Sounds view lists `SOUND_GROUPS` (`workbench/sounds.ts`).

## Tuning
The values are in `src/constants.ts` (`PLAYER`, `SWINGS`, `DASH`, `TOUCH`) and in each enemy's file. After changing physics, `npm run check:blocks` re-checks the reach of the placed items (the reach rules at the top of `meadow.ts` may need updating), and `playtest.levels()` whether every level still clears.
