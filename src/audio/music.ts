import Phaser from 'phaser';
import { MUSIC, musicUrls, type MusicKey, type MusicTrack } from '../assets/manifest';
import { MAX_FRAME_MS } from '../constants';
import { webAudio } from './sfx';

// On the game's sound manager, not a scene's, so a track plays on across scenes.

const VOLUME = 1;
const FADE_MS = 700;

type Sound = Phaser.Sound.BaseSound & { volume: number };

let game: Phaser.Game | null = null;
let current: { track: MusicTrack; sound: Sound } | null = null;
let wanted: MusicTrack | null = null;
let next: MusicTrack | null = null;
const fadingOut = new Set<Sound>();
const files = new Map<MusicTrack, Promise<ArrayBuffer>>();
const decoding = new Map<MusicTrack, Promise<void>>();

export function initMusic(g: Phaser.Game): void {
  game = g;
  g.events.on(Phaser.Core.Events.STEP, (_: number, delta: number) => fade(Math.min(delta, MAX_FRAME_MS)));
}

/** One after another, so each is there before the story gets to it. */
export async function preloadMusic(keys: MusicKey[]): Promise<void> {
  for (const key of keys) if (!game?.cache.audio.exists(MUSIC[key])) await file(MUSIC[key]).catch(() => undefined);
}

export function playMusic(scene: Phaser.Scene, key: MusicKey): void {
  const track = MUSIC[key];
  wanted = track;
  if (current?.track === track) return;
  fadeOutCurrent();
  const audio = webAudio(game);
  if (scene.cache.audio.exists(track)) start(track);
  else if (audio) void decoded(audio, track).then(() => { if (wanted === track) start(track); }, () => undefined);
  else {
    scene.load.audio(track, musicUrls(track));
    scene.load.once(`${Phaser.Loader.Events.FILE_KEY_COMPLETE}audio-${track}`, () => { if (wanted === track) start(track); });
    if (!scene.load.isLoading()) scene.load.start();
  }
  release();
}

export function expectMusic(key: MusicKey): void {
  next = MUSIC[key];
  const audio = webAudio(game);
  if (audio) void decoded(audio, next).catch(() => undefined);
  release();
}

const needed = (track: MusicTrack): boolean => track === wanted || track === next || track === current?.track || track === MUSIC.title;

function file(track: MusicTrack): Promise<ArrayBuffer> {
  let f = files.get(track);
  if (!f) {
    const [ogg, mp3] = musicUrls(track);
    f = fetch(game?.device.audio.ogg ? ogg : mp3).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${r.url}`))));
    f.catch(() => files.delete(track));
    files.set(track, f);
  }
  return f;
}

function decoded(audio: Phaser.Sound.WebAudioSoundManager, track: MusicTrack): Promise<void> {
  const cache = audio.game.cache.audio;
  if (cache.exists(track)) return Promise.resolve();
  let d = decoding.get(track);
  if (!d) {
    d = file(track).then(data => new Promise<void>((resolve, reject) => {
      if (!needed(track)) { reject(new Error('not needed any more')); return; }
      // a copy: decoding empties the buffer it's given
      audio.context.decodeAudioData(data.slice(0), buffer => { cache.add(track, buffer); release(); resolve(); }, reject);
    })).finally(() => decoding.delete(track));
    decoding.set(track, d);
  }
  return d;
}

function release(): void {
  const cache = game?.cache.audio;
  for (const track of Object.values(MUSIC)) if (!needed(track) && cache?.exists(track)) cache.remove(track);
}

function start(track: MusicTrack): void {
  if (!game || current?.track === track) return;
  const sound = game.sound.add(track, { loop: true, volume: 0 }) as Sound;
  sound.play();
  current = { track, sound };
}

function fadeOutCurrent(): void {
  if (current) fadingOut.add(current.sound);
  current = null;
}

function fade(delta: number): void {
  const step = (VOLUME * delta) / FADE_MS;
  if (current && current.sound.volume < VOLUME) current.sound.volume = Math.min(VOLUME, current.sound.volume + step);
  for (const s of fadingOut) {
    s.volume = Math.max(0, s.volume - step);
    if (s.volume === 0) { s.destroy(); fadingOut.delete(s); }
  }
}
