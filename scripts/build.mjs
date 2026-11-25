import { build } from 'vite';

const watch = process.argv.includes('--watch');

await build({
  configFile: false,
  base: './',
  build: {
    emptyOutDir: !watch,
    target: 'chrome124',
    watch: watch ? {} : null,
    rollupOptions: {
      input: { popup: 'popup.html', background: 'src/background/index.ts' },
      output: { entryFileNames: '[name].js' },
    },
  },
});

await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    target: 'chrome124',
    watch: watch ? {} : null,
    lib: { entry: 'src/content/index.ts', name: 'DomAndGloom', formats: ['iife'], fileName: () => 'content.js' },
  },
});
