// Shared by the workbench (in the browser) and the art tools: no imports here, not even node:*.

export function draftFrame(file: string): { w: number; h: number } | undefined {
  const m = /@(\d+)x(\d+)\.png$/.exec(file);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : undefined;
}

export const liveFile = (file: string): string => file.replace(/@\d+x\d+\.png$/, '.png');

export const assetFileOf = (path: string): string =>
  liveFile(path.replace(/\\/g, '/').replace(/^.*?(?:public\/assets\/|workbench\/drafts\/[^/]+\/)/, ''));
