import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';

// Multi-platform: mode standalone | playgama | ytgame. Mỗi mode chỉ KHÁC nhau ở đúng những gì
// bảng MODES khai — outDir vẫn là `dist/` cho cả 3 (B5 snapshot dist→build/<mode> sau mỗi build).
// Luật nền: PC-15 (bundle nộp không call mạng) · SPEC §5.4 (debug hook chỉ ở standalone) ·
// án lệ M8 G8b (bundle playgama PHẢI có script bridge, thiếu là rớt game_ready).

/** Script bridge bắt buộc của Playgama — URL ĐỘC NHẤT được phép ở bản nộp kênh này. */
const PLAYGAMA_BRIDGE_URL = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';

/** Thư viện nhúng được tách thành chunk `vendor-*` riêng để cổng check-bundle phân xử vendor. */
const VENDOR_PACKAGES = ['phaser'] as const;

/**
 * SPEC §5.4 — mặt debug (?debug ?level ?seed ?ad=mock + parser đọc location) chỉ được SỐNG ở kênh
 * dev. Kênh nộp: alias trỏ cửa debug sang bản Null Object (`src/platform/debugNoop.ts`) ngay ở
 * bước phân giải module ⇒ thân debug thật không vào được graph, chuỗi khoá bị loại khỏi .js nộp.
 * Cột `devTools` là DỮ LIỆU: thêm kênh dev mới = thêm một dòng bảng, không rải if. Server `vite dev`
 * luôn được giữ mặt debug (xem `devTools` ở cuối file).
 */
const DEBUG_DOOR_SPECIFIER = /^(\.\.?\/)+platform\/debug$/;
const DEBUG_DOOR_RELEASE = fileURLToPath(new URL('./src/platform/debugNoop.ts', import.meta.url));

/** Khai báo khác biệt theo mode. Thêm nền tảng = thêm một dòng bảng. */
const MODES: Record<string, { bridgeScript: boolean; devTools: boolean }> = {
  ytgame: { bridgeScript: false, devTools: false },
  playgama: { bridgeScript: true, devTools: false },
  standalone: { bridgeScript: false, devTools: true },
};
const DEFAULT_MODE = { bridgeScript: false, devTools: false };

/** Alias theo mode: rỗng khi giữ debug (standalone), thay cửa debug khi nộp. */
function aliasesFor(devTools: boolean) {
  return devTools ? [] : [{ find: DEBUG_DOOR_SPECIFIER, replacement: DEBUG_DOOR_RELEASE }];
}

/** Tiêm <script src=bridge> vào head của bản playgama (bản khác: 0 tag mạng). */
function bridgeScriptPlugin(url: string): Plugin {
  return {
    name: 'playgama-bridge-script',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'script', attrs: { src: url }, injectTo: 'head-prepend' }],
  };
}

/** Tên module có thuộc một package nhúng trong VENDOR_PACKAGES không (đường dẫn node_modules). */
function isVendor(id: string): boolean {
  return VENDOR_PACKAGES.some((pkg) => id.includes('/node_modules/' + pkg + '/'));
}

export default defineConfig(({ mode, command }) => {
  const profile = MODES[mode] ?? DEFAULT_MODE;
  // `vite dev` (command 'serve') KHÔNG bao giờ strip: mặt debug là công cụ làm việc hằng ngày.
  // Bản build mới tuân cột devTools của bảng MODES.
  const devTools = command === 'serve' || profile.devTools;
  return {
    base: './',
    root: fileURLToPath(new URL('./', import.meta.url)),
    publicDir: fileURLToPath(new URL('./public', import.meta.url)),
    build: {
      target: 'es2020',
      outDir: 'dist',
      emptyOutDir: true,
      assetsInlineLimit: 0,
      // Engine tách riêng ⇒ cổng kiểm phân xử được "code của ta" (0 call mạng) với thư viện nhúng.
      rollupOptions: { output: { manualChunks: (id: string) => (isVendor(id) ? 'vendor-phaser' : undefined) } },
      // polyfill modulepreload của Vite chứa `fetch(` — nộp thì 0 call mạng, và webview đích hỗ trợ.
      modulePreload: { polyfill: false },
    },
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        ...aliasesFor(profile.devTools),
      ],
    },
    plugins: profile.bridgeScript ? [bridgeScriptPlugin(PLAYGAMA_BRIDGE_URL)] : [],
  };
});
