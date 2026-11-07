# Stack

How the game is put together. Adding things: docs/recipes.md.

## Map
The folders, and the files a name doesn't explain.
```
src/
  config.ts      the game config the workbench shares
  constants.ts   tuning values (PLAYER, SWINGS, DASH, TOUCH), BIRD_BOX, BIRD_SCREEN_X, DEPTH, BUBBLE, the tables the art shares (BRICK, DIG_FLOOR)
  events.ts      Level-to-HUD events (LevelEvents, emitLevel), until(): listeners dropped at shutdown
  rivals.ts      the rival birds (RIVALS): their sheets, portraits, anims and characters come from it
  texts/         every text by key: en.ts (all), de.ts (German)
  assets/        the manifest (every image, sheet, animation, music track) + typed key helpers
  scenes/        Boot, Title, Language, Cutscene, Level, HUD, Credits (+ keys.ts: scene names, fade.ts: fadeIn, leave)
  entities/      Player, Pickups, Enemies (+ ENEMY_SYMBOLS), BossFight, Rainbow, feedback.ts, enemies/ (Enemy, Rogue, Kaktu,
                 Archid, Fae, Barrier: Web/Wall + breaks.ts, Boss, Grey, Teal, Lime (+ limeCat.ts) + bosses.ts, bossEvents.ts)
  track/         Track (block streaming), symbols.ts (block symbols and rules), a block file per biome
  story/         flow.ts (FLOW), characters, cutscene.ts (types, HEADS), cutscenes/ (a script each + beats.ts), music.ts
  world/         biomes, Backdrop, the ground strip, the veil of a dark biome
  ui/            colors, the pixel font, Label, Button, Slider, SpeechBubble, touch, the HUD's dash bar, scrim
  audio/         settings (mute, volume), sfx (synth), music (tracks, preloading, crossfade)
  dev/           dev builds only: the sidebar, the play-tests
public/assets/   every PNG, a folder per key group; music/; page/ (the tab's icon, the link's preview, the loading and asleep screens)
public/licenses.txt  the licence texts, shipped as is
tools/
  check-blocks.ts  every level's blocks: symbol rules, pits, dash spacing, the reach of placed items (simulated with the game's constants)
  check-assets.ts  manifest against public/assets: files exist, sheet sizes, animation frames, nothing unlisted
  check-texts.ts   texts against code and translations: unused keys, placeholders, the font's characters, bubble fit; cutscenes' actor ids
  text-rules.ts    what makes a text wrong, for check-texts and the workbench's Texts view
  texts-server.ts  the dev server's end of the Texts view: saves a text into src/texts/<lang>.ts, asked from this computer only
  art/             the art generators by subject, lib/ (pixels, shapes, PNG, drafts), bake.ts (writes the PNGs),
                   sheet.ts (a close look), same.ts (a draft set against the game's files)
workbench/       the workbench: art, sounds, texts (a dev page; drafts/ is git-ignored)
vite.config.ts   the dev server: its port, the texts endpoint, the workbench's address
.github/workflows/pages.yml  a version tag that matches package.json builds it and puts it on GitHub Pages
```

## Libraries & Tools
- Phaser 4, Vite, TypeScript (strict; `tsc` only typechecks, Vite strips the types). Phaser is the one runtime dependency (docs/node.md).
- The tools run on plain Node (22.18 or newer, which strips types), typed by `tools/node-shims.d.ts`. Each loads `tools/resolve-ts.ts`, which lets it import src modules as written for Vite and refuses Phaser: what the tools import from `src/` stays Phaser-free.
- The build uses relative paths (`base: './'`), so it works under any path. The title shows `package.json`'s version.

## Display
- 400x225, `pixelArt`, `roundPixels`. `fitZoom` (`src/scale.ts`, the workbench's too): on desktop a whole number of device pixels per game pixel (a plain fit if that wastes over 20% of the window); on touch screens it fills the screen unless a crisp fit loses at most 3%.
- The loading screen is plain HTML and CSS in `index.html`, there before the script: the running bird, the word in every language (`page.loading`) and a bar that `Boot` fills; `Boot` removes it when the title is up.
- The gate (`src/gate.ts`): the build opens at `OPENS`, midnight on the player's device. Before that `main.ts` doesn't start the game and shows `#asleep` from `index.html` instead: Bobo napping (`page.asleep`, eight frames) and the words `asleep.*` (`page.asleep_words`). The secret link `?key=...` opens it on a device for good: its hash is `KEY`, kept in the save; the link loses the key at once. A new key's hash: `node --import ./tools/resolve-ts.ts -e "import('./src/gate.ts').then(g => console.log(g.keyHash('the key')))"`. The dev build never locks; `npm run preview` does.
- `src/hello.ts`: in a build, the browser's console shows Bobo in ASCII art, awake or (while the gate is shut) asleep in the nest, and a line in every language (`console.hello` / `console.asleep`).
- The page's head: the icons, the link's preview (`og:` tags, the picture by its whole hosted address) and `noindex`. The pictures are `PAGE_IMAGES`, baked by `tools/art/page.ts`; `check:assets` wants each named in the head.
- Portrait on a touch screen: the rotate overlay (`src/orientation.ts`, plain DOM). It swallows input and emits `GameEvent.Blocked` / `Unblocked`: a level pauses, a cutscene and the credits freeze (`freezeWhileBlocked`). On Android a tap asks for fullscreen and a landscape lock (`enterLandscape`); iPhones can't lock.
- `src/wake.ts` keeps the screen on while the story plays (a wake lock, https only); the title and three minutes without input let go.
- Tiles are 16 px; the ground line is `GROUND_Y`; the camera follows the bird horizontally, at `BIRD_SCREEN_X`. Draw order: `DEPTH`. Anything more than `DROP_BEHIND` px past the screen's left edge is dropped.

## Scenes & Story
`Boot` (the images, the title music, the font, the animations; it starts fetching the other tracks), then `Title`, `Language`, the story and `Title` again.
- The story is `FLOW` (`src/story/flow.ts`): cutscenes and levels, then the credits. A flow scene gets `{ step }` in `init()` and calls `playStep(this, step + 1)` when it's done; `playStep(-1)` is the title; `restartAt()` jumps (the dev sidebar, the play-tests). `playStep` saves the step by its id, and `continueAt()` gives it back after a reload.
- Cutscenes are data (`src/story/cutscene.ts`: a stage, music, actors, beats), played by the `Cutscene` scene. A speech bubble sits above its speaker (below one in the sky); `HEADS` says where a head is when it isn't the sprite's top centre. Shared pieces: `cutscenes/beats.ts`; who speaks: `src/story/characters.ts`.
- Level runs with the HUD scene on top. Level to HUD: `emitLevel()` (`src/events.ts`, payloads typed by `LevelEvents`); HUD to Level: `pauseRun()`, `resumeRun()`, `quitToTitle()`. It pauses on the HUD's button, P / Esc, a hidden tab, the window losing focus, the rotate overlay; the HUD's clock and tweens wait with it (a line being said, the banner), and the press that resumes is swallowed.

## Level, Frame by Frame
`Level.update()`:
1. `Controls` turns keys, touches (or the bot's `driver`) into presses.
2. The phase: `ready` waits for a press (that press doesn't also jump); `cleared` and `failed` wait for one after `RETRY_DELAY`.
3. `Player.step()` moves the bird. The run time adds up capped frame deltas (`frameDt`). The bird's timers and the rainbow shots go by `Level.clock`, the time physics has run: it stops while paused and slows with the slow motion; the waits between bosses use real time.
4. The boss fight, the Track (builds a screen ahead, drops what's behind), falling items, the backdrop.
5. While the bird is alive and the level isn't over: it collects items, its attacks hit enemies (`Enemies.strikes`; sounds and effects: `feedback.ts`), the enemies move, and touching one or a hazard calls `hurt()`: a heart, then 1.5 s of blinking. Below the screen it `fall()`s: a heart, and it's put back past the pit (`Track.respawnX`). The last heart fails the stage.

## The Bird
- `Player` is an invisible physics sprite plus a `view` sprite placed after each physics step: effects go on the view, since Arcade resizes a body with its sprite.
- In `update()` physics has stepped, but Phaser moves the sprite only after it, and the camera follows when drawing: `player.x` and `cam.scrollX` are a frame behind. What keeps pace with the camera goes by `Player.steppedX` (the Level's `camLeft`), or it shakes when frames take uneven numbers of steps.
- The movement values are `PLAYER` in `src/constants.ts`; `BIRD_BOX` is the hitbox, shared with the block checker. No horizontal drag (Arcade's drag slows even a velocity set every frame), so `runSpeed` is the real speed.
- Attacks: a swing (`SWINGS`: the peck, or the cleave where the level has it, `swingOf()`) is a hitbox in front of the head for a moment; the dash (`DASH`) holds its height, can't be hurt and hits with its body. Each attack has a number (`nextAttackId()`, shared with the rainbow shots and Teal's feathers), so an enemy is hit once per attack.

## Track, Enemies, Items
- A level (`LEVELS`) is an intro block, then its blocks tier by tier (docs/levels.md). The Track turns each block's ASCII into ground between pits, one-way planks, items, decor, enemies and low branches. The symbols and their rules are `SYMBOLS` (`src/track/symbols.ts`, Phaser-free for the checker); the Track handles every symbol, or it doesn't compile.
- Enemies (`src/entities/enemies/`) are sprites on scripted paths with a hitbox (no physics bodies), moved by the time physics stepped (`stepped`), spawned by symbol (`ENEMY_SYMBOLS`) and stepped once they're near the screen. More than one hp shows as pips above it. Webs and walls (`Barrier`) are enemies that break where they're hit (`breaks.ts`).
- Bosses (`LevelDef.bosses`, `BossFight`) follow the camera: always stepped, never dropped. `Boss.ts` is the shared part (keeping pace, hover, swoop, knock-back, the boss bar, the drop); Grey, Teal and Lime extend it.
- Their sounds and effects go to the Level as events (`bossEvents.ts`: sent with `emitBoss()`, heard with `hookBoss()`); `feedback.ts` plays them, and the bird's, for the Level and the workbench alike. A line said during the run goes to the HUD (`LevelEvent.Say`; its speaker: `RUN_LINES`).
- The rainbow powers, for Lime's last part, are `Rainbow`, given at `LimeEvent.Gift`: a charged button's attack is the rainbow's. Its shots (`Fx.rainbowCleave`, `rainbowDash`: a `Shot`) fly on ahead and hit through `Enemies.strikes`.
- Items (`ITEMS`) are placed by blocks or carried by enemies; `Pickups` places and drops them. A boss stage has no goal item: `BossFight` reports its last boss beaten. A set of pieces (the keys) always looks like the next missing piece, and the HUD shows a slot for each.

## Input
- Four buttons: jump (hold: glide), slide, attack, dash; all but jump are unlocked per level (`verbs`). The keys are `BINDINGS` (`src/controls.ts`), read from key-down events, so a tap shorter than a frame counts; Ctrl with a bound key is kept from the browser. The scenes' own keys go through `onPress` (a held key's repeats only with `{ repeat: true }`), a tap on nothing through `onTapAway`.
- Touch: the `TOUCH` layout, slide and attack on the left, jump and dash on the right. A touch goes to the nearest button on its half; a half without buttons passes it on (a jump-only level jumps anywhere). Taps on the black bars beside the game don't count: Phaser reports them as outside the canvas. Discs and icons: `src/ui/touch.ts`.
- Help texts never spell out the bindings: `Controls.label(id)` and `pressTo(verb)`. Touch is `isTouchScreen()` everywhere.
- Buttons in the HUD keep their taps from the Level (Phaser's top-only input). A button or icon reacts only to a press that started on it (`onTap`, `src/ui/Button.ts`). Nothing starts on a gesture (swipe, double tap): the tap has already jumped.
- The dev sidebar (`src/dev/sidebar.ts`; F2 or the key left of 1; on a touch screen `?dev` in the address): any story step, any boss or part of Lime's fight (`LevelData.from`, `BossStart`), cheats, hitboxes, the play-tests, autoplay.

## Assets
- Every image is a PNG in `public/assets/`, by key in `src/assets/manifest.ts` (`IMAGES`, `SHEETS`, `ANIMS`, `MUSIC`, `PAGE_IMAGES`). Scene code wraps keys in `tex()` / `anim()` (`src/assets/keys.ts`).
- The art is generated by `tools/art/` (docs/recipes.md, section Art; what exists: docs/assets.md); the pixel font (`src/ui/font.ts`) and the sound effects are code.
- A biome (`src/world/biomes.ts`) is a look: sky, parallax layers, ground (it may overhang the walkable line: `groundOverhang`), plank, decor. `Backdrop` draws the sky and layers, `groundStrip()` the ground; screens without a camera pan it with `Backdrop.pan()`. A `dark` biome (the Swamp) gets a veil under the creatures, items and the bird (`veil()`, `DEPTH.veil`), lifted a little by each goal item. A `ceiling` (the Tower) runs along the top of its level, over what hangs from it and under the HUD; the Nest is the Tower's look without it.

## Texts
- Every text is a key in `src/texts/en.ts`, German in `de.ts`. Code and data hold keys and show them with `t(key, vars)` (`src/language.ts`); what shows before a language is picked uses `inEvery(key)`, and the Title has no words. How-to: docs/recipes.md, section Texts & Languages.
- All text is a `Label` (`src/ui/text.ts`): the pixel font in capitals, one line each, on whole pixels (a half-pixel position mangles the glyphs): move it with `moveTo()`, tween it with `onUpdate: snapToPixels`. Never Phaser's `Text`.

## Audio
- Music (`src/audio/music.ts`): one looping track at a time, crossfaded across scenes (`playMusic`). The files are fetched behind the title in the story's order (`preloadMusic`, about 10 MB); a track is decoded only while it plays or is up next (`expectMusic`; `src/story/music.ts` knows each step's): all twelve decoded would take about 350 MB, too much for a phone.
- Sound effects (`src/audio/sfx.ts`): a small Web Audio synth through Phaser's sound manager, so mute, volume and the mobile audio unlock apply. Each sound is a list of tones (`TONES`), so the workbench can draw it too.
- `src/audio/settings.ts`: the volume (on a curve, louder on touch screens) and mute, kept by the game itself: Phaser's `sound.mute` reads wrong while the AudioContext is suspended.

## Save
`src/save.ts`, guarded (the game works without storage): the settings, the story's step (a level starts over), whether the story's been played through and the gate's key. No high scores.

## Testing
- `npm run check`: `tsc`, then the checkers in `tools/` (Map).
- Play-tests (`src/dev/playtest.ts`, dev builds: the dev sidebar's Test section, or the console). The game is taken off the browser's frame loop and stepped at 60 fps as fast as it computes, then handed back at the same story step.
  - `playtest.levels()`: a bot (`autopilot`) clears every level and says what cost each heart.
  - `playtest.checks()`: a level's states (the first press, pause, hurt, fail, a fall, clear), the whole story from the title to the credits, a reload, and 20 restarts without anything piling up.
  - `playtest.cutscene(id, stop)` / `playtest.level(id, stop)`: plays up to a moment and holds it for a screenshot; `playtest.release()` hands the game back. Autoplay: the bot plays the current level in real time, to watch.
  - While stepping, `Date.now()` follows the stepped clock (tweens run on it), the sound is muted, and the harness runs the cameras' `preRender` (a headless step skips it).
- On a phone: `npm run dev` listens on the LAN; open the address it prints. `npm run preview` does the same for the build (`npm run build` first), under its Pages path.
