import { ANIMS, IMAGES, PAGE_IMAGES, SHEETS, type AnimKey } from '../src/assets/manifest';
import { BIOMES, type BiomeId } from '../src/world/biomes';
import { TOUCH, type ButtonId } from '../src/constants';
import { RAINBOW_BUTTONS, iconOf, rainbowIconOf } from '../src/ui/touch';
import { draftFrame, liveFile } from '../tools/art/lib/drafts';

type Frame = { w: number; h: number };
/** Without a key: a new image that only exists as drafts. */
export interface Asset { file: string; key?: string; frame?: Frame }
export interface Version { name: string; tex: string; frame?: Frame }

export const LIVE = 'Live';
export const ALL_FRAMES = 'All Frames';
export const NEW_FRAMES = 'New Frames';

const draftUrls = import.meta.glob<string>('./drafts/*/**/*.png', { query: '?url', import: 'default', eager: true });
/** asset file (without the @WxH) -> draft set -> the draft */
export const drafts = new Map<string, Map<string, { url: string; frame?: Frame }>>();
for (const [path, url] of Object.entries(draftUrls)) {
  const m = /^\.\/drafts\/([^/]+)\/(.+)$/.exec(path);
  if (!m) continue;
  const file = liveFile(m[2]);
  if (!drafts.has(file)) drafts.set(file, new Map());
  drafts.get(file)!.set(m[1], { url, frame: draftFrame(m[2]) });
}

export const ASSETS: Asset[] = [
  ...Object.entries({ ...IMAGES, ...PAGE_IMAGES }).map(([key, file]) => ({ key, file })),
  ...Object.entries(SHEETS).map(([key, s]) => ({ key, file: s.file, frame: { w: s.w, h: s.h } })),
];
for (const [file, sets] of drafts) if (!ASSETS.some(a => a.file === file)) ASSETS.push({ file, frame: [...sets.values()][0].frame });
export const nameOf = (a: Asset) => a.key ?? a.file;
ASSETS.sort((a, b) => Number(drafts.has(b.file)) - Number(drafts.has(a.file)) || nameOf(a).localeCompare(nameOf(b)));

export const draftTex = (file: string, set: string) => `${set}:${file}`;
export const versionsOf = (a: Asset): Version[] => [
  ...(a.key ? [{ name: LIVE, tex: a.key, frame: a.frame }] : []),
  ...[...(drafts.get(a.file) ?? [])].map(([set, d]) => ({ name: set, tex: draftTex(a.file, set), frame: d.frame ?? a.frame })),
];
export const animsOf = (a: Asset): string[] => [
  ...(Object.entries(ANIMS) as [AnimKey, (typeof ANIMS)[AnimKey]][]).filter(([, d]) => d.sheet === a.key).map(([k]) => k),
  ALL_FRAMES,
  ...(a.key && drafts.has(a.file) ? [NEW_FRAMES] : []),
];
export const setsOf = (images: Asset[]) => [LIVE, ...new Set(images.flatMap(a => [...(drafts.get(a.file)?.keys() ?? [])]))];

export const biomeOf = (a: Asset): BiomeId | undefined => {
  const [group, id] = a.key?.split('.') ?? [];
  return group === 'world' && id in BIOMES ? (id as BiomeId) : undefined;
};
export const isWorldArt = (a: Asset) => Object.values(BIOMES).some(b => b.ground === a.key || b.layers.some(l => l.key === a.key));

export const BUTTON_IDS = Object.keys(TOUCH.buttons) as ButtonId[];
const INTERFACE_FILES = [...BUTTON_IDS.map(id => IMAGES[iconOf(id)]), IMAGES['ui.icon_cleave'], ...RAINBOW_BUTTONS.map(id => IMAGES[rainbowIconOf(id)]), SHEETS['ui.rainbow_ring'].file];
export const BUTTON_SETS = [LIVE, ...new Set(INTERFACE_FILES.flatMap(file => [...(drafts.get(file)?.keys() ?? [])]))];
