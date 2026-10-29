import { readFileSync, writeFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import type { LanguageId } from '../src/language.ts';

const FILES: Record<LanguageId, string> = { en: 'src/texts/en.ts', de: 'src/texts/de.ts' };
const isLanguage = (id: unknown): id is LanguageId => typeof id === 'string' && Object.hasOwn(FILES, id);

const literal = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`;
const quote = (text: string) => (text.includes("'") && !text.includes('"') ? JSON.stringify(text) : `'${text.replace(/[\\']/g, '\\$&')}'`);

function withText(source: string, key: string, text: string): string | undefined {
  const line = new RegExp(String.raw`^(\s*'${key.replace(/[.-]/g, '\\$&')}': )(?:${literal}),$`, 'm');
  return line.test(source) ? source.replace(line, (_, head: string) => `${head}${quote(text)},`) : undefined;
}

export const textsServer = (): Plugin => {
  // what it wrote last, per file: writing doesn't reload the game and the workbench
  const written = new Map<string, string>();
  return {
    name: 'texts-server',
    // returned, so it's added after Vite's own middlewares: behind their host check
    configureServer: server => () => {
      server.middlewares.use('/__texts', async (req, res) => {
        const reply = (status: number, text: string) => { res.statusCode = status; res.end(text); };
        try {
          // `npm run dev` listens on the LAN: only this computer may write
          if (!/^(::1$|(::ffff:)?127\.)/.test(req.socket.remoteAddress ?? '')) return reply(403, 'only from this computer: open the workbench at localhost');
          if (req.method !== 'POST' || req.headers['content-type'] !== 'application/json') return reply(400, 'POST JSON');
          let body = '';
          const utf8 = new TextDecoder();
          for await (const chunk of req) body += utf8.decode(chunk, { stream: true });
          const { lang, key, text } = (JSON.parse(body) ?? {}) as { lang?: unknown; key?: unknown; text?: unknown };
          if (!isLanguage(lang) || typeof key !== 'string' || !/^[\w.-]+$/.test(key)
            || typeof text !== 'string' || !text.trim() || /[\n\r\p{Zl}\p{Zp}]/u.test(text)) {
            return reply(400, 'needs a language, a key and a text on one line');
          }
          const file = FILES[lang], path = `${server.config.root}/${file}`;
          const source = withText(readFileSync(path, 'utf8'), key, text);
          if (source === undefined) return reply(404, `${file} has no ${key}`);
          written.set(path, source);
          writeFileSync(path, source);
          reply(200, 'saved');
        } catch (e) {
          reply(400, String(e));   // a throw here would end the dev server
        }
      });
    },
    async handleHotUpdate({ file, read }) {
      return written.has(file) && written.get(file) === (await read()) ? [] : undefined;
    },
  };
};
