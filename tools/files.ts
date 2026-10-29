import { readdirSync } from 'node:fs';

/** Everything under `dir`, folders too, relative to it and with forward slashes. */
export const filesUnder = (dir: string): string[] => readdirSync(dir, { recursive: true }).map(f => f.replace(/\\/g, '/'));
