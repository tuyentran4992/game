// E2E probe V-H1 — trả lời bằng câu hỏi/tham số, một file chạy được 2 chế độ:
//   node m1_vh1_probe.mjs serve <port>      → dựng server tĩnh cho QA/QV tự mở
//   node m1_vh1_probe.mjs check <port>      → tự boot (Playwright nếu có, fallback CDP) + in JSON bằng chứng
// Luồng deterministic: seed localStorage 'game_save' best_score=120 TRƯỚC khi load →
//   ván 1 thua điểm 0 (best−last = 120−0 = 120) → về Start phải thấy delta-bar "120 POINTS ...".
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('./M1-Rescue-Dodge/game/dist', import.meta.url).pathname;
const MODE = process.argv[2];
const PORT = Number(process.argv[3] || 5408);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };

function serve() {
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = join(DIST, p);
    if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  srv.listen(PORT, () => console.log(`V-H1 probe server :${PORT} (dist V-H1) — Ctrl+C để tắt`));
}

async function check() {
  // Tìm Chrome + Playwright (global install /usr/lib/node_modules + system chrome)
  let chromium = null;
  try {
    const { createRequire } = await import('node:module');
    const gReq = createRequire('/usr/lib/node_modules/noop.js');
    ({ chromium } = gReq('playwright'));
  } catch { /* fallback CDP bên dưới */ }

  const SEED = JSON.stringify({ schema_version: 2, best_score: 120, bestScore: 120, total_fish: 0, totalFish: 0, total_games_played: 1, totalGamesPlayed: 1 });

  if (chromium) {
    const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript({ content: `try { localStorage.setItem('game_save', ${JSON.stringify(SEED)}); } catch {}` });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    const read = async () => page.evaluate(() => {
      const g = window.__game;
      if (!g) return null;
      const sc = g.scene.getScene('StartScene');
      if (!sc) return null;
      const bar = sc.children.list.find((o) => o.getData && o.getData('testid') === 'delta-bar');
      return { booted: true, barText: bar ? bar.text : null, barVisible: bar ? bar.visible : null };
    });
    let out = null;
    for (let i = 0; i < 40; i++) { out = await read(); if (out && out.barText !== null) break; await new Promise((r) => setTimeout(r, 250)); }
    // Ván 1 thua điểm 0: nhấn Play, Tutorial tự qua, nhường ong chạm (thua nhanh), về Start đọc lại
    let flow = { note: 'chưa chạy luồng thua (chỉ verify màn Start)' };
    if (out && out.barText) {
      try {
        await page.evaluate(() => { __game.scene.getScene('StartScene').children.list.find((o) => o.getData && o.getData('testid') === 'start-btn').emit('pointerdown'); });
        await page.waitForFunction(() => !!window.__game && !!window.__game.scene.getScene('GameplayScene'), { timeout: 15000 });
        await page.waitForFunction(() => !!window.__game && !!window.__game.scene.getScene('GameOverScene'), { timeout: 90000 });
        // GameOver → Main Menu (không qua PauseModal nên engine.score còn nguyên lastScore)
        await page.evaluate(() => {
          const go = __game.scene.getScene('GameOverScene');
          const menu = go.children.list.find((o) => o.getData && o.getData('testid') === 'menu-btn');
          if (menu) menu.emit('pointerdown');
        });
        await page.waitForFunction(() => {
          if (!window.__game) return false;
          const sc = window.__game.scene.getScene('StartScene');
          return sc && sc.children.list.some((o) => o.getData && o.getData('testid') === 'delta-bar');
        }, { timeout: 15000 });
        await new Promise((r) => setTimeout(r, 700));
        const bar2 = await page.evaluate(() => {
          const sc = window.__game.scene.getScene('StartScene');
          const bar = sc.children.list.find((o) => o.getData && o.getData('testid') === 'delta-bar');
          return { barText: bar ? bar.text : null, barVisible: bar ? bar.visible : null };
        });
        flow = { note: 'sau ván thua điểm 0, best 120', ...bar2 };
      } catch (e) { flow = { note: 'luồng thua lỗi: ' + String(e).slice(0, 200) }; }
    }
    console.log(JSON.stringify({ mode: 'playwright', start: out, flow, consoleErrors: errors }, null, 2));
    await browser.close();
  } else {
    console.error('playwright không có — dùng browser-use/CDP mở http://127.0.0.1:' + PORT + ' rồi đọc testid delta-bar (TEST-FIELDS.md)');
    process.exit(2);
  }
}

if (MODE === 'serve') serve();
else if (MODE === 'check') await check();
else { console.error('dùng: node m1_vh1_probe.mjs serve|check <port>'); process.exit(1); }
