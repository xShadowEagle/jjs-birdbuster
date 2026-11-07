import { savedKey, saveKey } from './save';

/** Midnight on the player's device (month 11: December). */
const OPENS = new Date(2026, 11, 4);
/** keyHash() of the secret link's `?key=`: before OPENS, it opens the game on that device for good. Empty: no key works. */
const KEY: string = '15ju43u32le';

/** cyrb53 (by bryc, public domain): 53 bits in base 36. */
export function keyHash(key: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Whether the game may start: the dev build always does. */
export function awake(): boolean {
  if (import.meta.env.DEV) return true;
  const url = new URL(location.href), key = url.searchParams.get('key');
  const opened = KEY !== '' && key !== null && keyHash(key) === KEY;
  if (key !== null) {
    url.searchParams.delete('key');
    history.replaceState(history.state, '', url);
  }
  if (opened) saveKey(KEY);
  return opened || Date.now() >= OPENS.getTime() || (KEY !== '' && savedKey() === KEY);
}
