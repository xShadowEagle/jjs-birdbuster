# Workbench

A development page, not part of the game build: contains every image in the asset manifest next to its drafts, in the game's 400x225 frame over any biome; the enemies' and the bird's attacks; the sounds; and every text, to edit and translate.

## Usage

Start `npm run dev`, then open http://localhost:5273/workbench/ (or use the development sidebar's *Workbench* link).

## Drafts

A draft set is a folder in `workbench/drafts/` that mirrors `public/assets/`:

```
workbench/drafts/fluffy/characters/bird.png     a draft of public/assets/characters/bird.png
workbench/drafts/plain/characters/bird.png      another set, shown side by side
workbench/drafts/big/characters/bird@48x48.png  another frame size: the size in the name
workbench/drafts/new/enemies/owl@24x24.png      a new sheet, not yet in the manifest
```

- Sheets keep the manifest's frame layout, so a draft plays the game's own animations.
- Saving a draft reloads the page; the view is kept in the URL.
- A generator can bake into a set: `npm run bake:art -- --out workbench/drafts/fluffy bird`.

## Views

The panel lists the keys each view uses.

- **scene:** an image's versions side by side, animated, on the ground; backdrops and grounds in place, one version at a time.
- **sheet:** each version's whole image, sheets as numbered frames.
- **breaks:** the web and the wall breaking.
- **interface:** the touch buttons and the HUD's dash bar in each state.
- **enemies:** an enemy or a boss and its attacks at the running bird.
- **attacks:** the bird's moves, into the air or at a target, with the game's hits, effects and sounds.
- **sounds:** every sound effect, played and drawn as its tones over time.
- **texts:** every text in English and German, shown as the game shows it. It saves only when opened on this computer (localhost), not over the network.

In the enemies and attacks views a version is a draft set: its drafts stand in for the game's images.

Keys: Up/Down Image (Enemy, Target, Sound, Text); Left/Right Biome; A Animation (Attack); W the enemy's attack; Q/E Version; 1 to 4 Size; V View; Space Run (sounds: Play).
