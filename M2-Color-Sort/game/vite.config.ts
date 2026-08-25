import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';

// Build web cho Playables: base './' để chạy khi đóng gói zip (BR-05, không mạng ngoài).
//
// P0-4 — publicDir TRƯỚC ĐÂY trỏ tới `../assets` nên Vite copy NGUYÊN thư mục,
// kéo theo `assets/.gen_cache/*.src.png` (2.07 MB ảnh nguồn của asset pipeline)
// vào dist/zip. Nay dùng `game/public` (chỉ chứa `raw/` = asset thật được preload)
// + plugin chốt hạ: xoá mọi thứ ngoài whitelist khỏi dist/raw sau khi build.
const SHIPPED_RAW = [
  'bg_space.png',    // nền galaxy (drawGalaxyBg)
  'tube_base.png',   // thân ống kính thật (drawTube → glassImg)
  'liquid_neon.png', // mặt thoáng chất lỏng (renderLiquid → surfaceImg)
  'ui_chrome.png',   // khung panel neon (drawPanel → NineSlice)
  'bgm_main.mp3',
  'sfx_pour.mp3',
  'sfx_error.mp3',
  'sfx_clear.mp3',
  'sfx_click.mp3',
];

/** Chỉ giữ đúng asset ĐANG được load; xoá cache/ảnh rác lọt vào dist. */
function pruneDistAssets(outDir: string): Plugin {
  return {
    name: 'm2-prune-dist-assets',
    closeBundle() {
      const rawDir = resolve(outDir, 'raw');
      if (existsSync(rawDir)) {
        for (const f of readdirSync(rawDir)) {
          if (!SHIPPED_RAW.includes(f)) {
            rmSync(resolve(rawDir, f), { recursive: true, force: true });
            this.warn(`pruned unused asset from dist: raw/${f}`);
          }
        }
      }
      // Không bao giờ ship cache của asset pipeline (2.07 MB).
      for (const junk of ['.gen_cache', 'raw/.gen_cache']) {
        const p = resolve(outDir, junk);
        if (existsSync(p)) {
          rmSync(p, { recursive: true, force: true });
          this.warn(`pruned build cache from dist: ${junk}`);
        }
      }
      // Báo file > 512 KB (mục tiêu M2-10) để không âm thầm phình bundle.
      const report = (dir: string) => {
        if (!existsSync(dir)) return;
        for (const f of readdirSync(dir)) {
          const p = resolve(dir, f);
          if (statSync(p).isDirectory()) { report(p); continue; }
          const kb = statSync(p).size / 1024;
          if (kb > 512) this.warn(`file > 512 KB target: ${f} = ${kb.toFixed(0)} KB`);
        }
      };
      report(outDir);
    },
  };
}

const outDir = fileURLToPath(new URL('./dist', import.meta.url));

export default defineConfig({
  base: './',
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [pruneDistAssets(outDir)],
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2048,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
