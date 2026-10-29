import { defineConfig, type Plugin } from 'vite';
import { textsServer } from './tools/texts-server.ts';

const workbenchUrls = (): Plugin => ({
  name: 'workbench-urls',
  configureServer(server) {
    const printUrls = server.printUrls.bind(server);
    server.printUrls = () => {
      printUrls();
      for (const url of server.resolvedUrls?.local ?? []) server.config.logger.info(`  ➜  Workbench: ${url}workbench/`);
    };
  },
});

export default defineConfig({
  base: './',
  server: { port: 5273 },
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
  plugins: [workbenchUrls(), textsServer()],
});
