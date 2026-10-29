// localStorage can be missing or throw (private mode, blocked site data): every access is guarded.
const KEY = 'jjs-birdbuster';

interface SaveData { muted: boolean; volume: number; beaten: boolean; language?: string; place?: string }

const DEFAULT_VOLUME = 0.5;

function load(): SaveData {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SaveData>;
    const volume = typeof d.volume === 'number' && d.volume >= 0 && d.volume <= 1 ? d.volume : DEFAULT_VOLUME;
    const text = (v: unknown) => (typeof v === 'string' ? v : undefined);
    return { muted: d.muted ?? false, volume, beaten: d.beaten === true, language: text(d.language), place: text(d.place) };
  } catch { return { muted: false, volume: DEFAULT_VOLUME, beaten: false }; }
}

function store(d: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

export function savedMuted(): boolean { return load().muted; }
export function saveMuted(muted: boolean): void { store({ ...load(), muted }); }
export function savedVolume(): number { return load().volume; }
export function saveVolume(volume: number): void { store({ ...load(), volume }); }
export function savedLanguage(): string | undefined { return load().language; }
export function saveLanguage(language: string): void { store({ ...load(), language }); }
export function savedBeaten(): boolean { return load().beaten; }
export function saveBeaten(beaten: boolean): void { store({ ...load(), beaten }); }
export function savedStepId(): string | undefined { return load().place; }
export function saveStepId(id: string | undefined): void { store({ ...load(), place: id }); }
