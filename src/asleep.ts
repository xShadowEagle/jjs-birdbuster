import { saveWoken } from './save';

const POKES = 5;
/** ms: as long as index.html's poked animation. A poke during it doesn't count. */
const TWITCH = 400;
/** ms: as long as index.html's waking animation */
const WAKING = 1500;

/**
 * Shows index.html's #asleep while the gate is shut. With `wake`, Bobo is only napping: five pokes wake him, then `wake` gets
 * an AudioContext made during the last poke, so the game's sound can start without another tap.
 */
export function showAsleep(wake?: (audio?: AudioContext) => void): void {
  const screen = document.getElementById('asleep')!, bird = screen.querySelector<HTMLElement>('.bird')!;
  screen.hidden = false;
  screen.querySelector<HTMLElement>(wake ? '.words.nap' : '.words.deep')!.hidden = false;
  if (!wake) {
    document.getElementById('loading')?.remove();
    return;
  }
  screen.classList.add('napping');
  for (const img of bird.querySelectorAll('img')) img.loading = 'eager';      // hidden until the first poke: lazy, they'd come late
  bird.querySelector('.poked')!.addEventListener('animationend', () => bird.classList.remove('poked'));
  let pokes = 0, last = -Infinity;
  // pointerup, not pointerdown: on a touch screen it's the one that lets a page start sound
  const poke = () => {
    const now = performance.now();
    if (now - last < TWITCH) return;
    last = now;
    bird.classList.remove('poked');
    if (++pokes < POKES) {
      bird.style.setProperty('--row', String(pokes - 1));
      void bird.offsetWidth;                                 // so the reaction plays again
      bird.classList.add('poked');
      return;
    }
    screen.removeEventListener('pointerup', poke);
    saveWoken();
    bird.classList.add('waking');
    const audio = 'AudioContext' in window ? new AudioContext() : undefined;
    setTimeout(() => { screen.remove(); wake(audio); }, WAKING);
  };
  screen.addEventListener('pointerup', poke);
}
