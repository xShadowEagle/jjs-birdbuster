// Loaded with `node --import ./tools/resolve-ts.ts ...` (the npm scripts do).
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'phaser') throw new Error(`${context.parentURL} imports Phaser: tools may only import Phaser-free src modules (data, constants, types)`);
    try {
      return next(specifier, context);
    } catch (e) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw e;
    }
  },
});
