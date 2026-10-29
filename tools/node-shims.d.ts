// Instead of @types/node: extend when a tool needs more.
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Uint8Array;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string, options: { recursive: true }): string[];
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: Uint8Array | string): void;
}
declare module 'node:path' {
  export function dirname(path: string): string;
}
declare module 'node:http' {
  export class IncomingMessage implements AsyncIterable<Uint8Array> {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
  }
  export class ServerResponse {
    statusCode: number;
    end(data?: string): void;
  }
}
declare module 'node:module' {
  interface ResolveResult { url: string; format?: string | null; shortCircuit?: boolean }
  interface ResolveContext { parentURL?: string }
  type NextResolve = (specifier: string, context: ResolveContext) => ResolveResult;
  export function registerHooks(hooks: {
    resolve?: (specifier: string, context: ResolveContext, next: NextResolve) => ResolveResult;
  }): void;
}
declare module 'node:zlib' {
  export function deflateSync(data: Uint8Array, options?: { level?: number }): Uint8Array;
  export function inflateSync(data: Uint8Array): Uint8Array;
}
declare const process: { argv: string[]; exit(code: number): never };
