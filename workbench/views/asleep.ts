import { SCREENS, onChange, state } from '../state';
import { LIVE, drafts } from '../catalog';

const box = document.getElementById('asleep')!;
const screen = box.querySelector<HTMLElement>('.screen')!;
const frame = box.querySelector('iframe')!;
const caption = box.querySelector<HTMLElement>('.caption')!;
const pageUrl = () => `../?asleep${state.sleep === 'nap' ? '=nap' : ''}`;
/** index.html: #asleep's padding on both sides, and its gap above the caption */
const PAD = 24, GAP = 8;

function fit(): void {
  if (!document.body.classList.contains('asleep')) return;
  const [, , w, h] = SCREENS.find(([id]) => id === state.screen)!;
  const room = box.getBoundingClientRect();
  const shown = Math.min(1, (room.width - PAD) / w, (room.height - PAD - GAP - caption.offsetHeight) / h);
  Object.assign(frame.style, { width: `${w}px`, height: `${h}px`, transform: `scale(${shown})` });
  Object.assign(screen.style, { width: `${w * shown}px`, height: `${h * shown}px` });
  const asleep = frame.contentDocument?.getElementById('asleep');
  const k = asleep ? getComputedStyle(asleep).getPropertyValue('--k').trim() : '?';
  caption.textContent = `${w} x ${h}   art ${k}x   shown at ${Math.round(shown * 100)}%`;
}

/** Live, and every draft set with a page picture. */
export const asleepVersions = () => [LIVE, ...new Set([...drafts].filter(([file]) => file.startsWith('page/')).flatMap(([, sets]) => [...sets.keys()]))];

/** A draft set's pictures stand in for the page's own. */
function useVersion(): void {
  const set = asleepVersions()[state.pick];
  for (const img of frame.contentDocument?.querySelectorAll<HTMLImageElement>('#asleep img') ?? []) {
    const file = (img.dataset.file ??= img.getAttribute('src')!.replace('/assets/', ''));
    const url = (set !== LIVE && drafts.get(file)?.get(set)?.url) || `/assets/${file}`;
    if (img.getAttribute('src') !== url) img.src = url;
  }
}

function sync(): void {
  const on = state.view === 'asleep';
  document.body.classList.toggle('asleep', on);
  if (on && frame.getAttribute('src') !== pageUrl()) frame.src = pageUrl();
  if (on) useVersion();
  fit();
}

/** Puts Bobo back to sleep: the page again, from the start. */
export const sleepAgain = () => frame.contentWindow?.location.reload();

export function initAsleep(): void {
  frame.addEventListener('load', () => {
    useVersion();
    fit();
    // a poke focuses the page in the frame: the workbench's keys still work
    frame.contentWindow?.addEventListener('keydown', e => window.dispatchEvent(new KeyboardEvent('keydown', e)));
  });
  new ResizeObserver(fit).observe(box);
  onChange(sync);
}
