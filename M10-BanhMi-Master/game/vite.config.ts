import { defineConfig } from 'vite'

// Port dev 5210 (an lei M9: moi game 1 port). Scale.FIT xu ly o Phaser config.
export default defineConfig({
  base: './',
  server: { port: 5210, host: true },
  preview: { port: 5210 },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0
  }
})
